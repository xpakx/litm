import type { Binding } from "./bindings.js";
import { EventBus } from "./event-bus.js";
import { componentOf, HTMLComponent } from "./html-component.js";
import { Panel } from "./panel.js";
import type { ReadonlySignal, Signal } from "./signal.js";
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
	bind?(ctx: ComponentContext): void;
	dockWindow?(ctx: WindowContext): void;
	dockPanel?(ctx: ComponentContext): void;
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
	services: Service[];
}

export interface Zone {
	zone: HTMLElement;
	panel?: Panel | undefined;
	pannableArea?: HTMLElement;
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
	private _zones: Map<string, Zone> = new Map();
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

                const parentElement = zone === undefined ? this.desktop : this.getWindowAreaFor(zone);
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

	getComponent(name: string): HTMLElement | undefined {
		const config = this.components.getWindowConfig(name);
		if (!config) return undefined;
		return this.createComponent(config);
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
			if ('init' in serviceFn) this.initService(serviceFn, context);
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
			this.addZone(areaName, zone);
		});
	}

	registerZone(htmlId: string) {
		const zone = document.getElementById(htmlId);
		if (!zone) return;
		zone.style.position = 'relative';
		this.addZone(htmlId, zone);
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
                const zone = this.getZone(area);
		if (!zone) return;

		let panel = zone.panel;
		if (panel) return panel;

		panel = new Panel(area, zone.zone);
		zone.panel = panel;
		return panel;
	}

	clearZone(area: string) {
                const zone = this.getZone(area);
		if (!zone) return;
		zone.zone.innerHTML = '';
		zone.panel = undefined;
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

	getZone(name: string): Zone | undefined {
		return this._zones.get(name);
	}

	addZone(areaName: string, mainElement: HTMLElement) {
		this._zones.set(areaName, {zone: mainElement});
	}

	getWindowAreaFor(area: string): HTMLElement | undefined {
                const zone = this.getZone(area);
		if (!zone) return;
		if (zone.pannableArea) return zone.pannableArea;
		return zone.zone;
	}

	enableZonePanning(area: string) {
		const zone = this.getZone(area);
		if (!zone) return;

		zone.zone.style.overflow = 'auto';

		let isDown = false;
		let startX: number, startY: number, scrollLeft: number, scrollTop: number;

		zone.zone.addEventListener('mousedown', (e: MouseEvent) => {
			if ((e.target as HTMLElement).closest('.app-window')) return;
			isDown = true;
			zone.zone.style.cursor = 'grabbing';
			startX = e.pageX - zone.zone.offsetLeft;
			startY = e.pageY - zone.zone.offsetTop;
			scrollLeft = zone.zone.scrollLeft;
			scrollTop = zone.zone.scrollTop;
		});

		zone.zone.addEventListener('mouseleave', () => { 
			isDown = false;
			zone.zone.style.cursor = 'auto';
		});
		zone.zone.addEventListener('mouseup', () => { 
			isDown = false;
			zone.zone.style.cursor = 'auto';
		});
		zone.zone.addEventListener('wheel', (e: WheelEvent) => {
			if ((e.target as HTMLElement).closest('.app-window')) {
				e.preventDefault(); 
				e.stopPropagation(); 
			}
		}, { passive: false }); 

		zone.zone.addEventListener('mousemove', (e: MouseEvent) => {
			if (!isDown) return;
			if ((e.target as HTMLElement).closest('.app-window')) return;
			e.preventDefault();
			const x = e.pageX - zone.zone.offsetLeft;
			const y = e.pageY - zone.zone.offsetTop;
			zone.zone.scrollLeft = scrollLeft - (x - startX);
			zone.zone.scrollTop = scrollTop - (y - startY);
		});
		this.setScrollableContent(area, 10000, 10000); // TODO
	}

	setScrollableContent(area: string, width: number, height: number) {
	    const zone = this.getZone(area);
	    if (!zone) return;

	    let content = zone.pannableArea;
	    if (!content) {
		content = document.createElement('div');
		content.className = 'scrollable-content';
		zone.zone.appendChild(content);
		zone.pannableArea = content;
	    }
	    
	    content.style.width = `${width}px`;
	    content.style.height = `${height}px`;
	    content.style.position = 'relative';
	}


	initService(service: Service, context: ComponentContext) {
		if('bind' in service) service.bind(context);
		else if (context.body instanceof HTMLComponent) {
			//TODO: autobind
			const component = context.body;
			const signalFields = this.getSignalFields(service);
			console.log(signalFields);
			const methods = this.getMethods(service);
			console.log(methods);

			const ComponentClass = component.constructor as typeof HTMLComponent;
			const bindings = ComponentClass.bindings();
			bindings.forEach((b) => this.bindSignal(service, b, component, signalFields, methods));
		}
		service.init(context);

	}

	isSignal(val: any): val is Signal<any> {
		return (
			typeof val === 'function' &&
			typeof val.set === 'function' &&
			typeof val.update === 'function' &&
			typeof val.subscribe === 'function'
		);
	}

	isReadOnlySignal(val: any): val is ReadonlySignal<any> {
		return (
			typeof val === 'function' &&
			typeof val.subscribe === 'function'
		);
	}

	getSignalFields(obj: Record<string, any>): Record<string, Signal<any>> {
		const result: Record<string, Signal<any>> = {};

		for (const [key, value] of Object.entries(obj)) {
			if (this.isSignal(value)) {
				result[key] = value;
			}
		}

		return result;
	}

	bindSignal(
		service: Service,
		binding: Binding,
		component: HTMLComponent,
		signals: Record<string, Signal<any>>,
		actions: Record<string, Function>,
	) {
		switch (binding.kind) {
			case 'attribute':  {
				console.log(`Binding ${binding.attr} on ${binding.elem}`);
				const signal = signals[binding.signal];
			        if(!signal) return;
				component.bindAttribute(
					binding.elem,
					binding.attr,
					signal
				);
			}
			break;

			case 'class': {
				console.log(`Binding class on ${binding.elem}`);
				const signal = signals[binding.signal];
			        if(!signal) return;
				component.bindDynamicClass(
					binding.elem,
					signal
				);
			}
			break;

			case 'content': {
				console.log(`Binding content for ${binding.elem}`);
				const signal = signals[binding.signal];
			        if(!signal) return;
				component.bindContent(
					binding.elem,
					signal
				);
			}
			break;

			case 'action':
				switch (binding.action.action) {
					case 'click':
						console.log("Binding click action");
						break;
					case 'trigger':
						console.log(`Biding trigger: ${binding.action.trigger}`);
						break;
				}
			break;
		}
	}

	getMethods(obj: any): Record<string, Function> {
		const actions: Record<string, Function> = {};

		const proto = Object.getPrototypeOf(obj);

		const props = Object.getOwnPropertyNames(proto).filter(prop => {
			if (prop === 'constructor' || prop.startsWith('_')) return false;

			const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
			return descriptor && typeof descriptor.value === 'function';
		});

		for (const key of props) {
			const value = obj[key];
			if (!actions[key]) actions[key] = value;
		}

		return actions;
	}
}
