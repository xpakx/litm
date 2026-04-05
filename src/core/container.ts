import type { PanelSettings } from "./app.js";
import type { HTMLComponent } from "./html-component.js";

interface Card {
	component: HTMLElement | HTMLComponent;
	settings: PanelSettings | undefined;
}

export class Container {
	_zoneName: string;
	_zone: HTMLElement;
	_container: HTMLElement;
	_cards: Card[] = [];

	constructor(areaName: string, zone: HTMLElement) {
		this._zone = zone;
		this._zoneName = areaName;

		let container = this._zone.querySelector('.app-panel-container') as HTMLElement;
		if (container) {
			this._container = container;
		} else {
			this._container = document.createElement('div');
			this._container.className = 'app-panel-container';
			this._zone.insertBefore(this._container, zone.firstChild);
		}
	}

	addElement(component: HTMLElement | HTMLComponent, settings?: PanelSettings) {
		this._container.appendChild(component);
		this._cards.push({
			component: component,
			settings: settings,
		});
	}

	removeElement(index: number): HTMLElement | HTMLComponent | null {
		const card = this._cards[index];
		if (!card) return null;

		if (card.component instanceof Node) this._container.removeChild(card.component);
		this._cards.splice(index, 1);

		return card.component;
	}

	killElement(index: number) {
		const card = this._cards[index];
		if (!card) return;

		if (card.component instanceof Node) this._container.removeChild(card.component);
		this._cards.splice(index, 1);

		if ('destroy' in card.component && card.component.permanent) card.component.destroy();

		const services = card.settings?.services ?? [];
		services.forEach((s) => {
			if ('destroy' in s) s.destroy(card.component);
		});
	}
}
