import type { PanelSettings, Service, WindowConfig, WindowContext } from "./app.js";
import { HTMLComponent } from "./html-component.js";
import type { Panel } from "./panel.js";

export class Window {
	_winElement: HTMLElement;
	_winHeader: HTMLElement;
	_component: HTMLElement | HTMLComponent;
	_zIndexFunc?: () => number;
	_addTabFunc?: (zone: string, settings: PanelSettings) => void;
	_getPanelFunc?: (zone: string) => Panel | undefined;
	dockable = false;
	dockAreas: string[] = [];
	_services: Service[];
	_settings: PanelSettings;

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
		this._settings = {
			id: id,
			title: title,
			width: width,
			height: height,
			dockable: config.dockable ?? false,
			dockAreas: config.dockAreas ?? [],
		};
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

	enableDrag(): (e: MouseEvent) => void {
		let lastClientX = 0, lastClientY = 0;
		let currentDropZone: HTMLElement | null = null

		let elementDrag = (e: MouseEvent) => {
			e.preventDefault();
			const deltaX = lastClientX - e.clientX;
			const deltaY = lastClientY - e.clientY;
			lastClientX = e.clientX;
			lastClientY = e.clientY;
			this._winElement.style.top = (this._winElement.offsetTop - deltaY) + "px";
			this._winElement.style.left = (this._winElement.offsetLeft - deltaX) + "px";

			if (this.dockable) {
				currentDropZone = this.hoverZone(e, currentDropZone);
			}
		}

		let closeDragElement = () => {
			document.onmouseup = null;
			document.onmousemove = null;
			if (this.dockable && currentDropZone) {
				this.dock(currentDropZone);
				currentDropZone = null;
			}
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
		return dragMouseDown
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

	destroy() {
		this._winElement.remove();
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

	setAddTab(func: (zone: string, settings: PanelSettings) => void) {
		this._addTabFunc = func;
	}

	setGetPanel(func: (zone: string) => Panel | undefined) {
		this._getPanelFunc = func;
	}

	onDock(zone: string) {
		this.destroy();
		this._addTabFunc!(zone, this._settings);
	}


	hoverZone(e: MouseEvent, currentDropZone: HTMLElement | null): HTMLElement | null {
		this._winElement.style.pointerEvents = 'none';
		const elUnder = document.elementFromPoint(e.clientX, e.clientY);
		this._winElement.style.pointerEvents = 'auto';

		const zone = elUnder ? elUnder.closest('.wf-zone') as HTMLElement : null;

		const newZone = currentDropZone !== zone && zone;
		if (!newZone) return zone;

		if (currentDropZone && currentDropZone !== zone) {
			currentDropZone.classList.remove('drag-over');
		}

		const zoneId = zone.id.replace('zone-', '');
		const panel = this._getPanelFunc!(zoneId);
		if (!panel) return zone;
		if (this.dockAreas.length > 0 && !this.dockAreas.includes(zoneId)) return zone;
		if (this.dockAreas.length == 0 && !panel.dockable) return zone;

		if (zone) zone.classList.add('drag-over');
		return zone;
	}

	dock(currentDropZone: HTMLElement) {
		currentDropZone.classList.remove('drag-over');
		const zoneId = currentDropZone.id.replace('zone-', '');
		const panel = this._getPanelFunc!(zoneId);
		if (!panel) return;
		if (this.dockAreas.length > 0 && !this.dockAreas.includes(zoneId)) return;
		if (this.dockAreas.length == 0 && !panel.dockable) return;
		this.onDock(zoneId);
	}
}
