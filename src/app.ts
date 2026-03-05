import type { HTMLComponent } from "./html-component";

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

// target is probably to have a Service with logic, some kind of 
// template in a form of Web Component (?) and maybe load
// html/css from file (?) that would make it easy to connect
// events in html to service and vice versa
export interface Service {
	init(ctx: WindowContext): void;
}

export class App { zIndexCounter: number = 100;
	desktop: HTMLElement;
	windowCounter: number = 0;

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
		} = config;

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
		this.desktop.appendChild(winEl);
		this.enableDrag(winEl, header);
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
			layoutZone.appendChild(zone);
		});

	}
}

export interface LayoutDefinition {
	rows?: string;
	cols?: string;
	areas: string[][];
}
