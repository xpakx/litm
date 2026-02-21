export class App {
	zIndexCounter: number = 100;
	desktop: HTMLElement;

	constructor(appElement: string) {
		this.desktop = document.getElementById(appElement)!;
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


	register(config: any) {
		const { 
			id = 'win-' + Date.now(), 
			title = 'Untitled', 
			x = 50,
			y = 50, 
			width = 300,
			height = 200,
			services = [],
			template = ''
		} = config;

		const winEl = this.createDOMWindow(
			id, x, y, width, height
		);
		const header = this.createDOMHeader(title);
		const body = this.createDOMBody(template);

		winEl.appendChild(header);
		winEl.appendChild(body);
		this.desktop.appendChild(winEl);
		this.enableDrag(winEl, header);
		this.enableActions(winEl, header);


		const context = {
			root: winEl,
			body: body,
			setTitle: (t: string) => header.querySelector('span')!.innerText = t,
				close: () => winEl.remove()
		};
		services.forEach((serviceFn: any) => serviceFn(context));

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


	enableDrag(element: HTMLElement, handle: any) {
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
}
