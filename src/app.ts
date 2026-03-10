import { HTMLComponent } from "./html-component.js";

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
	init(ctx: WindowContext): void;
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

	addTab(component: HTMLElement | HTMLComponent) {
		const btn = document.createElement('button');
		btn.className = 'app-tab-button';
		btn.innerHTML = `Test`; // TODO

		const pane = document.createElement('div');
		pane.className = 'app-tab-pane';

		pane.appendChild(component);

		btn.onclick = () => {
			this._tabBar.querySelectorAll('.app-tab-button').forEach(b => b.classList.remove('active'));
			this._panelContent.querySelectorAll('.app-tab-pane').forEach(p => p.classList.remove('active'));
			btn.classList.add('active');
			pane.classList.add('active');
		};

		this._tabBar.appendChild(btn);
		this._panelContent.appendChild(pane);
		if (this._tabBar.children.length === 1) btn.click();
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

	private getNextZIndex(): string {
		return `${++this.zIndexCounter}`;
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
		winEl.style.zIndex = this.getNextZIndex();
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

	private createDOMBody(template: string): HTMLElement {
		const body = document.createElement('div');
		body.className = 'app-body';
		body.innerHTML = template;
		return body;
	}

	private getNextWindowId(): string {
		return `${this.windowCounter++}`;
	}


	register(config: WindowConfig) {
		const { 
			id = 'win-' + this.getNextWindowId(), 
			title = 'Untitled', 
			x = 50,
			y = 50, 
			width = 300,
			height = 200,
			services = [],
			template = '',
			element = undefined,
			zone = undefined,
			trapInZone = false,
		} = config;

                const parentElement = zone === undefined ? this.desktop : this._zones.get(zone);
                if (!parentElement) return;


		const winEl = this.createDOMWindow(
			id, x, y, width, height
		);
		const header = this.createDOMHeader(title);

		let body: HTMLElement;
		if (element) {
			body = element;
			body.className = 'app-body';
		} else {
			 body = this.createDOMBody(template);
		}

		winEl.appendChild(header);
		winEl.appendChild(body);
		parentElement.appendChild(winEl);
		if (trapInZone) this.enableDragTrapped(winEl, header, parentElement);
		else this.enableDrag(winEl, header);
		this.enableActions(winEl, header);


		const context: WindowContext = {
			root: winEl,
			body: body,
			setTitle: (t: string) => header.querySelector('span')!.innerText = t,
			close: () => winEl.remove()
		};
		services.forEach((serviceFn: any) => {
			if ('init' in serviceFn) serviceFn.init(context);
			else serviceFn(context);
		});

		return context;
	}


	enableActions(winEl: HTMLElement, header: HTMLElement) {
		const btn = header.querySelector('.close-btn') as HTMLButtonElement;
		btn.onclick = () => {
			winEl.remove();
		};

		winEl.onmousedown = () => {
			winEl.style.zIndex = this.getNextZIndex();
		};
	}


	enableDrag(element: HTMLElement, handle: HTMLElement) {
		let lastClientX = 0, lastClientY = 0;

		let elementDrag = (e: MouseEvent) => {
			e.preventDefault();
			const deltaX = lastClientX - e.clientX;
			const deltaY = lastClientY - e.clientY;
			lastClientX = e.clientX;
			lastClientY = e.clientY;
			element.style.top = (element.offsetTop - deltaY) + "px";
			element.style.left = (element.offsetLeft - deltaX) + "px";
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

			element.style.zIndex = this.getNextZIndex();
		}
		handle.onmousedown = dragMouseDown;
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


	enableDragTrapped(element: HTMLElement, handle: HTMLElement, container: HTMLElement) {
		let lastClientX = 0, lastClientY = 0;

		let elementDrag = (e: MouseEvent) => {
			e.preventDefault();
			const deltaX = lastClientX - e.clientX;
			const deltaY = lastClientY - e.clientY;
			lastClientX = e.clientX;
			lastClientY = e.clientY;


                        let newTop = element.offsetTop - deltaY;
                        let newLeft = element.offsetLeft - deltaX;
                        
                        const maxW = container.clientWidth - element.offsetWidth;
                        const maxH = container.clientHeight - element.offsetHeight;
                        if(newTop < 0) newTop = 0;
			if(newLeft < 0) newLeft = 0;
                        if(newTop > maxH) newTop = maxH;
			if(newLeft > maxW) newLeft = maxW;

                        element.style.top = newTop + "px";
			element.style.left = newLeft + "px";
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

			element.style.zIndex = this.getNextZIndex();
		}
		handle.onmousedown = dragMouseDown;
	}

	createPanel(area: string, config: ComponentConfig) {
                const zone = this._zones.get(area);
		if (!zone) return;
		const panel = this.getPanel(area, zone);
		const component = this.registerComponent(config);
		panel.addTab(component);
		panel.hideTabs();
	}

	getPanel(area: string, zone: HTMLElement): Panel {
		let panel = this._panels.get(area);
		if (panel) return panel;

		panel = new Panel(area, zone);
		this._panels.set(area, panel);
		return panel;
	}

	addTab(area: string, component: HTMLElement | HTMLComponent | ComponentConfig) {
                const zone = this._zones.get(area);
		if (!zone) return;
		const panel = this.getPanel(area, zone);

		if (component instanceof HTMLElement) {
			panel.addTab(component);
		} else {
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
