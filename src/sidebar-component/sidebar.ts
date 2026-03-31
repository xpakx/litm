import { type ComponentConfig, type ComponentContext, type Service, type WindowConfig } from "../core/app.js";
import { diceWindow } from "../dice-component/dice-window.js";
import { componentOf, HTMLComponent, } from "../core/html-component.js";
import sidebarTemplate from './sidebar.html';

export class SidebarService implements Service {
	newWindow?: (a: string, x?: number, y?: number) => void;

	constructor() {
	}


	init(ctx: ComponentContext): void {
		this.newWindow = (c, x, y) => ctx.app.openWindow(c, x ?? 0, y ?? 0);
		const component = ctx.body as HTMLComponent;
		component.onClick('entry-1', () => this.openDice());
	}

	openDice() {
		this.newWindow!('dice');
	}

}

export function sidebarComponent(): ComponentConfig {
	return {
		services: [new SidebarService()],
		element: componentOf("sidebar-component", sidebarTemplate),
    }
}
