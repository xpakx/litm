import { HTMLComponent } from "./html-component.js";

interface Tab {
	pane: HTMLElement;
	button: HTMLElement;
	component: HTMLElement | HTMLComponent;
}

export class Panel {
	name: string;
	_zone: HTMLElement;

	_container: HTMLElement;
	_tabBar: HTMLElement;
	_panelContent: HTMLElement;

	constructor(name: string, zone: HTMLElement) {
		this.name = name;
		this._zone = zone;

		let container = this._zone.querySelector('.app-panel-container') as HTMLElement;
		if (container) {
			this._container = container;
			this._tabBar = container.querySelector('.app-tab-bar') as HTMLElement;
			this._panelContent = container.querySelector('.app-panel-content') as HTMLElement;
			this._panelContent.innerHTML = '';
			this._tabBar.innerHTML = '';
		} else {
			this._container = document.createElement('div');
			this._container.className = 'app-panel-container';

			this._tabBar = document.createElement('div');
			this._tabBar.className = 'app-tab-bar';
			this._container.appendChild(this._tabBar);

			this._panelContent = document.createElement('div');
			this._panelContent.className = 'app-panel-content';
			this._container.appendChild(this._panelContent);

			this._zone.insertBefore(this._container, zone.firstChild);
		}
	}

	hideTabs() {
		this._tabBar.style.display = 'none';
	}

	showTabs() {
		this._tabBar.style.display = 'flex';
	}

	_tabs: Tab[] = [];

	addTab(component: HTMLElement | HTMLComponent) {
		const btn = document.createElement('button');
		btn.className = 'app-tab-button';
		btn.innerHTML = `Test`; // TODO

		const pane = document.createElement('div');
		pane.className = 'app-tab-pane';

		pane.appendChild(component);

		btn.onclick = () => {
			this.switchTab(btn, pane);
		};


                let isDraggingTab = false;
                let startX = 0;
                let startY = 0;

                btn.onmousedown = (e) => {
                    startX = e.clientX;
		    startY = e.clientY;
                    isDraggingTab = false;

                    document.onmouseup = () => {
                        document.onmouseup = null;
			document.onmousemove = null;
                        if (!isDraggingTab) this.switchTab(btn, pane);
                    };

                    document.onmousemove = (moveEvent) => {
                        if (isDraggingTab) return;
			const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
			if (dist > 10) {
				isDraggingTab = true;
				document.onmouseup = null;
				document.onmousemove = null;

				btn.remove();
				// pane.remove();
				// TODO: create window
				// TODO: switch tab
			}
                    };
                };

		this._tabs.push({
			button: btn,
			pane: pane,
			component: component,
		});

		this._tabBar.appendChild(btn);
		this._panelContent.appendChild(pane);
		if (this._tabs.length === 1) this.switchTab(btn, pane);
	}

	switchTab(btn: HTMLElement, pane: HTMLElement) {
		if (btn.classList.contains('active')) return;
		this._tabs.forEach(b => b.button.classList.remove('active'));
		this._tabs.forEach(b => b.pane.classList.remove('active'));
		btn.classList.add('active');
		pane.classList.add('active');
	}

	removeTab(index: number): HTMLElement | HTMLComponent | null {
		const tab = this._tabs[index];
		if (!tab) return null;

		const wasActive = tab.button.classList.contains('active');

		if (tab.component instanceof Node) tab.pane.removeChild(tab.component);
		tab.button.remove();
		tab.pane.remove();
		this._tabs.splice(index, 1);

		if (wasActive && this._tabs.length > 0) {
			const nextActiveIndex = Math.max(0, index - 1);
			this._tabs[nextActiveIndex]!.button.click();
		}

		return tab.component;
	}
}
