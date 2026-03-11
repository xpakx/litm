import { App, type ComponentConfig, type ComponentContext, type Service, type WindowConfig } from "../app.js";
import { diceWindow } from "../dice-component/dice-window.js";
import { EventBus } from "../event-bus.js";
import { componentOf, HTMLComponent, } from "../html-component.js";
import { computed, deepSignal, signal, type ReadonlySignal, type Signal } from "../signal.js";
import sidebarTemplate from './sidebar.html';

export class SidebarService implements Service {
	newWindow?: (a: WindowConfig) => void;

	constructor() {
	}


	init(ctx: ComponentContext): void {
		this.newWindow = ctx.newWindow;
		const component = ctx.body as HTMLComponent;
		component.onClick('entry-1', () => this.openDice());
	}

	openDice() {
		this.newWindow!(diceWindow(100, 150));
	}

}

export function sidebarComponent(): ComponentConfig {
	return {
		services: [new SidebarService()],
		element: componentOf("sidebar-component", sidebarTemplate),
    }
}
