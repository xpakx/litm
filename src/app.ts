import { HTMLComponent } from "./html-component.js";
import { Panel } from "./panel.js";

export interface WindowContext {
	root: HTMLElement,
	body: HTMLElement,
	setTitle: (t: string) => void,
	close: () => void,
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
}

export interface ComponentContext {
	body: HTMLElement,
	close: () => void,
}

export interface ComponentConfig {
	services?: Service[];
	template?: string;
	element?: HTMLComponent;
}

export interface Service {
	init(ctx: ComponentContext): void;
	dockWindow?(ctx: WindowContext): void;
}

export class Window {
	_winElement: HTMLElement;
	_winHeader: HTMLElement;
	_component: HTMLElement | HTMLComponent;
	_zIndexFunc?: () => number;
	_services: Service[];

	constructor(config: WindowConfig, windowId: number, component: HTMLElement | HTMLComponent) {
		const { 
			id = 'win-' + windowId, 
			title = 'Untitled', 
			x = 50,
			y = 50, 
			width = 300,
			height = 200,
			services = [],
		} = config;
		this._winElement = this.createDOMWindow(id, x, y, width, height);
		this._winHeader = this.createDOMHeader(title);
		this._services = services;

		this._component = component;
		if (this._component instanceof HTMLComponent) {
			this._component.permanent = true;
		}

		this._winElement.appendChild(this._winHeader);
		this._winElement.appendChild(this._component);
	}

	setZIndex(index: number) {
		this._winElement.style.zIndex = `${index}`;
	}

	setZIndexFunc(func: () => number) {
		this._zIndexFunc = func;
	}

	private createDOMWindow(id: string, x: number, y: number,
			       width: number, height: number): HTMLElement {
		const winEl = document.createElement('div');
		winEl.className = 'app-window';
		winEl.id = id;
		winEl.style.left = x + 'px';
		winEl.style.top = y + 'px';
		winEl.style.width = width + 'px';
		winEl.style.height = height + 'px';
		return winEl;
	}

	private createDOMHeader(title: string): HTMLElement {
		const header = document.createElement('div');
		header.className = 'app-header';
		header.innerHTML = `
		<span>${title}</span>
		<div class="app-controls"><button class="close-btn" title="Close"></button></div>
		`;
		return header;
	}

	enableDragTrapped(container: HTMLElement) {
		let lastClientX = 0, lastClientY = 0;

		let elementDrag = (e: MouseEvent) => {
			e.preventDefault();
			const deltaX = lastClientX - e.clientX;
			const deltaY = lastClientY - e.clientY;
			lastClientX = e.clientX;
			lastClientY = e.clientY;


                        let newTop = this._winElement.offsetTop - deltaY;
                        let newLeft = this._winElement.offsetLeft - deltaX;
                        
                        const maxW = container.clientWidth - this._winElement.offsetWidth;
                        const maxH = container.clientHeight - this._winElement.offsetHeight;
                        if(newTop < 0) newTop = 0;
			if(newLeft < 0) newLeft = 0;
                        if(newTop > maxH) newTop = maxH;
			if(newLeft > maxW) newLeft = maxW;

                        this._winElement.style.top = newTop + "px";
			this._winElement.style.left = newLeft + "px";
		}

		let closeDragElement = () => {
			document.onmouseup = null;
			document.onmousemove = null;
		}

		let dragMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			lastClientX = e.clientX;
			lastClientY = e.clientY;
			document.onmouseup = closeDragElement;
			document.onmousemove = elementDrag;

			this._winElement.style.zIndex = `${this._zIndexFunc!()}`;
		}
		this._winHeader.onmousedown = dragMouseDown;
	}

	enableDrag() {
		let lastClientX = 0, lastClientY = 0;

		let elementDrag = (e: MouseEvent) => {
			e.preventDefault();
			const deltaX = lastClientX - e.clientX;
			const deltaY = lastClientY - e.clientY;
			lastClientX = e.clientX;
			lastClientY = e.clientY;
			this._winElement.style.top = (this._winElement.offsetTop - deltaY) + "px";
			this._winElement.style.left = (this._winElement.offsetLeft - deltaX) + "px";
		}

		let closeDragElement = () => {
			document.onmouseup = null;
			document.onmousemove = null;
		}

		let dragMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			lastClientX = e.clientX;
			lastClientY = e.clientY;
			document.onmouseup = closeDragElement;
			document.onmousemove = elementDrag;

			this._winElement.style.zIndex = `${this._zIndexFunc!()}`;
		}
		this._winHeader.onmousedown = dragMouseDown;
	}

	enableActions() {
		const btn = this._winHeader.querySelector('.close-btn') as HTMLButtonElement;
		btn.onclick = () => this.close();

		this._winElement.onmousedown = () => {
			this._winElement.style.zIndex = `${this._zIndexFunc!()}`;
		};
	}

	setTitle(title: string) {
		this._winHeader.querySelector('span')!.innerText = title;
	}

	close() {
		this._winElement.remove();
		if ('destroy' in this._component) this._component.destroy();
	}

	dockServices() {
		const context: WindowContext = {
			root: this._winElement,
			body: this._component,
			setTitle: (t: string) => this.setTitle(t),
			close: () => this.close()
		};

		this._services.forEach((service: Service | ((a: WindowContext) => void)) => {
			if ('dockWindow' in service) service.dockWindow(context);
		});
	}
}

export class App { zIndexCounter: number = 100;
	desktop: HTMLElement;
	windowCounter: number = 0;
	private _zones: Map<string, HTMLElement> = new Map();
	private _panels: Map<string, Panel> = new Map();

	static _instance: App;

	constructor(appElement: string) {
		this.desktop = document.getElementById(appElement)!;
		App._instance = this;
	}

	private createDOMBody(template: string): HTMLElement {
		const body = document.createElement('div');
		body.className = 'app-body';
		body.innerHTML = template;
		return body;
	}

	registerComponent(config: ComponentConfig): HTMLElement {
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
			close: () => body.remove()
		};
		services.forEach((serviceFn: any) => {
			if ('init' in serviceFn) serviceFn.init(context);
			else serviceFn(context);
		});

		return body;
	}

	private getNextZIndex(): number {
		return ++this.zIndexCounter;
	}

	private getNextWindowId(): number {
		return this.windowCounter++;
	}

	register(config: WindowConfig) {
		const { 
			element = undefined,
			zone = undefined,
			trapInZone = false,
		} = config;

                const parentElement = zone === undefined ? this.desktop : this._zones.get(zone);
                if (!parentElement) return;

		const component = this.registerComponent(config);
		if (element) component.className = 'app-body';

		const win = new Window(config, this.getNextWindowId(), component);
		win.setZIndexFunc(() => this.getNextZIndex());
		win.setZIndex(this.getNextZIndex());
		parentElement.appendChild(win._winElement);

		if (trapInZone) win.enableDragTrapped(parentElement);
		else win.enableDrag();
		win.enableActions();
		win.dockServices();
	}

	static instance(): App { 
		return this._instance;
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



	createPanel(area: string, config: ComponentConfig) {
		const panel = this.getPanelFor(area);
		if (!panel) return;
		const component = this.registerComponent(config);
		panel.addTab(component);
		panel.hideTabs();
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

	addTab(area: string, component: HTMLElement | HTMLComponent | ComponentConfig) {
		const panel = this.getPanelFor(area);
		if (!panel) return;

		if (component instanceof HTMLElement) {
			panel.addTab(component);
		} else {
			if (component.element) component.element.permanent = true;
			component = this.registerComponent(component);
			panel.addTab(component);
		}
	}
}

export interface LayoutDefinition {
	rows?: string;
	cols?: string;
	areas: string[][];
}
