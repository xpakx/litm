import { EventBus } from "./event-bus.js";
import { componentOf, HTMLComponent } from "./html-component.js";
import { Panel } from "./panel.js";
import { Window } from "./window.js";

export interface WindowContext {
	root: HTMLElement,
	body: HTMLElement,
	setTitle: (t: string) => void,
	close: () => void,
}

export interface ComponentDefinition {
	title?: string;
	width?: number;
	height?: number;
	servicesFactory?: () => Service[];
	template?: string;
	elementFactory?: () => HTMLComponent;
	zone?: string;
	trapInZone?: boolean;
	dockable?: boolean;
	dockAreas?: string[];
}

export interface WindowConfig {
	id?: string;
	title?: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	services?: Service[];
	template?: string;
	element?: HTMLComponent;
	zone?: string;
	trapInZone?: boolean;
	dockable?: boolean;
	dockAreas?: string[];
}

export interface ComponentContext {
	body: HTMLElement,
	close: () => void,
	app: App,
	bus: EventBus<Record<string, any>>,
}

export interface ComponentConfig {
	services?: Service[];
	template?: string;
	element?: HTMLComponent;
}

export interface Service {
	init(ctx: ComponentContext): void;
	dockWindow?(ctx: WindowContext): void;
	destroy?(body: HTMLElement | HTMLComponent): void;
}

export interface LayoutDefinition {
	rows?: string;
	cols?: string;
	areas: string[][];
}

export interface PanelSettings {
	id: string;
	title: string;
	width: number;
	height: number;
	dockable: boolean;
	dockAreas: string[];
}

export class ComponentLibrary {
	private _components: Map<string, ComponentDefinition> = new Map();
	private nameCounter: number = 0;

	private getNextName(): string {
		return `add-dummy${this.nameCounter++}`;
	}


	register(name: string, config: ComponentDefinition) {
		if(config.template) {
			const template = config.template
			const generatedName = this.getNextName()
			config.elementFactory = () => componentOf(generatedName, template);
		}
		this._components.set(name, config);
	}

	getWindowConfig(name: string): WindowConfig | undefined {
		const defaultConfig = this._components.get(name);
		if (!defaultConfig) return;
		const { elementFactory, servicesFactory, ...rest } = defaultConfig;
		let config: WindowConfig = {
			...rest,

		};
		if (elementFactory) config.element = elementFactory();
		if (servicesFactory) config.services = servicesFactory();
		
		return config;
	}
}

export class App { 
	zIndexCounter: number = 100;
	desktop: HTMLElement;
	windowCounter: number = 0;
	private _zones: Map<string, HTMLElement> = new Map();
	private _panels: Map<string, Panel> = new Map();
	bus: EventBus<Record<string, any>>;
	components: ComponentLibrary;

	constructor(appElement: string) {
		this.desktop = document.getElementById(appElement)!;
		this.bus = new EventBus();
		this.components = new ComponentLibrary();
	}

	private createDOMBody(template: string): HTMLElement {
		const body = document.createElement('div');
		body.className = 'app-body';
		body.innerHTML = template;
		return body;
	}

	private getNextZIndex(): number {
		return ++this.zIndexCounter;
	}

	private getNextWindowId(): number {
		return this.windowCounter++;
	}

	register(name: string, config: ComponentDefinition) {
		this.components.register(name, config);
	}

	openWindow(name: string, x: number, y: number, zone?: string) {
		let config = this.components.getWindowConfig(name);
		if (!config) return;
		config.x = x;
		config.y = y;

		if (zone) {
			config.zone = zone;
			config.trapInZone = true;
		}
		
		this.createWindow(config);
	}

	createWindow(config: WindowConfig) {
		const { 
			element = undefined,
			zone = undefined,
			trapInZone = false,
			dockable = false,
			dockAreas = [],
		} = config;

                const parentElement = zone === undefined ? this.desktop : this._zones.get(zone);
                if (!parentElement) return;

		const component = this.createComponent(config);
		if (element) component.className = 'app-body';

		const win = new Window(config, this.getNextWindowId(), component);
		win.setZIndexFunc(() => this.getNextZIndex());
		win.setZIndex(this.getNextZIndex());
		parentElement.appendChild(win._winElement);

		win.dockable = dockable || (dockAreas.length > 0);
		win.dockAreas = dockAreas;
		win.setAddTab((zone: string, settings: PanelSettings) => this.addTab(zone, component, settings));
		win.setGetPanel((zone: string) => this.getPanelFor(zone));

		if (trapInZone) win.enableDragTrapped(parentElement);
		else win.enableDrag();
		win.enableActions();
		win.dockServices();
	}

	createComponent(config: ComponentConfig): HTMLElement {
		const { 
			services = [],
			template = '',
			element = undefined,
		} = config;

		let body: HTMLElement;
		if (element) {
			body = element;
		} else {
			 body = this.createDOMBody(template);
		}

		const context: ComponentContext = {
			body: body,
			close: () => body.remove(),
			app: this,
			bus: this.bus,
		};
		services.forEach((serviceFn: any) => {
			if ('init' in serviceFn) serviceFn.init(context);
			else serviceFn(context);
		});

		return body;
	}

	setLayout(layout: LayoutDefinition) {
		const {
			rows = '',
			cols = '',
			areas
		} = layout;

		const layoutZone = document.createElement('div');
		layoutZone.className = 'app-zones';
		layoutZone.id = 'app-zones';
		layoutZone.style.gridTemplateRows = rows;
		layoutZone.style.gridTemplateColumns = cols;
		layoutZone.style.display = 'grid';
		layoutZone.style.width = '100%';
		layoutZone.style.height = '100%';
		let areaString = '';
		areas.forEach(r => areaString += `"${r.join(' ')}" `);
		layoutZone.style.gridTemplateAreas = areaString;

		this.desktop.appendChild(layoutZone);


		[...new Set(areas.flat())].forEach(areaName => {
			const zone = document.createElement('div');
			zone.id = `zone-${areaName}`;
			zone.className = 'wf-zone';
			zone.style.gridArea = areaName;
			zone.style.position = 'relative';
			layoutZone.appendChild(zone);
			this._zones.set(areaName, zone);
		});
	}

	registerZone(htmlId: string) {
		const zone = document.getElementById(htmlId);
		if (!zone) return;
		zone.style.position = 'relative';
		this._zones.set(htmlId, zone);
	}


	createPanel(area: string, config: ComponentConfig, dockable?: boolean) {
		const panel = this.getPanelFor(area);
		if (!panel) return;
		const component = this.createComponent(config);
		panel.addTab(component);
		panel.hideTabs();
		if (dockable) panel.dockable = true;
	}

	getPanelFor(area: string): Panel | undefined {
                const zone = this._zones.get(area);
		if (!zone) return;

		let panel = this._panels.get(area);
		if (panel) return panel;

		panel = new Panel(area, zone);
		this._panels.set(area, panel);
		return panel;
	}

	clearZone(area: string) {
                const zone = this._zones.get(area);
		if (!zone) return;
		zone.innerHTML = '';
		this._panels.delete(area);
	}

	createTab(area: string, name: string) {
		let config = this.components.getWindowConfig(name);
		if (!config) return;
		this.addTab(area, config);
	}

	addTab(area: string, component: HTMLElement | HTMLComponent | ComponentConfig, settings?: PanelSettings) {
		const panel = this.getPanelFor(area);
		if (!panel) return;

		if (component instanceof HTMLElement) {
			panel.addTab(component, settings);
		} else {
			if (component.element) component.element.permanent = true;
			component = this.createComponent(component);
			panel.addTab(component, settings);
		}
		panel.setToWindowFunc((c, e, s) => this.addWindow(c, e, s));
	}

	addWindow(component: HTMLElement | HTMLComponent, event: MouseEvent, settings?: PanelSettings) {
                const parentElement = this.desktop;
		const config = { 
			x: event.x - (settings ? settings.width/2 : 150),
			y: event.y - 10,
			...(settings ?? {})
		}
		const win = new Window(config, this.getNextWindowId(), component);
		win.setZIndexFunc(() => this.getNextZIndex());
		win.setZIndex(this.getNextZIndex());
		parentElement.appendChild(win._winElement);

		win.dockable = true;
		win.dockAreas = config.dockAreas ?? [];
		win.setAddTab((zone: string, settings: PanelSettings) => this.addTab(zone, component, settings));
		win.setGetPanel((zone: string) => this.getPanelFor(zone));

		const dragEvent = win.enableDrag();
		dragEvent(event);
		win.enableActions();
		win.dockServices();
	}

	getZone(name: string): HTMLElement | undefined {
		return this._zones.get(name);
	}
}
