import { type WindowContext } from "./app.js";

export interface DOMSignal {
	(): string;
	set(value: string): void;
	update(updater: (current: string) => string): void;
}

export abstract class HTMLComponent extends HTMLElement {
	protected ui: ShadowRoot;
	public windowContext?: WindowContext;
	protected static template?: HTMLTemplateElement;
	protected static stylesheet?: CSSStyleSheet;
	private _signals: Map<string, DOMSignal> = new Map();
	private _elements: Map<string, HTMLElement> = new Map();

	constructor() {
		super();
		this.ui = this.attachShadow({ mode: 'open' });
		this.createElement();
	}

	setContext(ctx: WindowContext) {
		this.windowContext = ctx;
		this.onContextReady();
	}

	getComponentProperty(name: string): string | null {
		return this.getAttribute(name);
	}

	emit(eventName: string, payload: any = {}) {
		this.dispatchEvent(new CustomEvent(eventName, {
			bubbles: true,
			composed: true,
			detail: payload
		}));
	}

	protected onContextReady() {}

	static html(): string {
		return '';
	}

	static css(): string {
		return '';
	}

	createElement() {
		const ComponentClass = this.constructor as typeof HTMLComponent;
		if (!ComponentClass.template) ComponentClass.registerTemplate();
		this.ui.appendChild(ComponentClass.template!.content.cloneNode(true));


		if (!ComponentClass.stylesheet) ComponentClass.registerStyles();
		if (ComponentClass.stylesheet) {
			this.ui.adoptedStyleSheets = [ComponentClass.stylesheet];
		}
	}

	static registerTemplate() {
		this.template = document.createElement('template');
		this.template.innerHTML = this.html();
	}

	static registerStyles() {
		const cssText = this.css();
		if (cssText) {
			this.stylesheet = new CSSStyleSheet();
			this.stylesheet.replaceSync(cssText);
		}
	}

	// UPDATING

	// TODO: update by variable name, not id
	getContentSignal(id: string): DOMSignal {
		if (this._signals.has(id)) {
			return this._signals.get(id)!;
		}

		const el = this.ui.getElementById(id);
		
		if (!el) {
			console.warn(`[HTMLComponent] Element with id '${id}' not found. Signal will fail.`);
			const noopSignal = (() => '') as DOMSignal;
			noopSignal.set = () => {};
			noopSignal.update = () => {};
			return noopSignal;
		}

		const signal = (() => el.textContent || '') as DOMSignal;

		signal.set = (value: string) => {
			el.textContent = value;
		};

		signal.update = (updater: (current: string) => string) => {
			el.textContent = updater(el.textContent || '');
		};

		this._signals.set(id, signal);
		return signal;
	}

	private getById(name: string): HTMLElement | undefined {
		if (this._elements.has(name)) {
			return this._elements.get(name)!;
		}
		const elem = this.ui.getElementById(name);
		if (!elem) {
			console.warn(`[HTMLComponent] Trying to update '${name}' non-existent element`);
			return;
		}
		this._elements.set(name, elem);
		return elem;
	}

	setContent(name: string, content: string): void {
		const elem = this.getById(name);
		if (!elem) return;
		elem.innerText = content;
	}

	onClick(name: string, func: () => void) {
		this.ui.getElementById(name)?.addEventListener('click', func);
	}

	addClass(name: string, ...cls: string[]) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.classList.add(...cls);
	}

	removeClass(name: string, ...cls: string[]) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.classList.remove(...cls);
	}

	toggleClass(name: string, cls: string) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.classList.toggle(cls);
	}

	chooseClass(name: string, choice: string, cls: string[]) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.classList.remove(...cls);
		elem.classList.add(choice);
	}

	pokeAnimation(name: string, cls: string) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.classList.remove(cls);
		void elem.offsetWidth;
		elem.classList.add(cls);
	}

	setColor(name: string, color: string): void {
		const elem = this.getById(name);
		if (!elem) return;
		elem.style.color = color;
	}

}

export function register(tagName: string) {
	return (constructor: CustomElementConstructor) => {
		if (customElements.get(tagName)) return;
		customElements.define(tagName, constructor);
		console.log(`registered component ${tagName}`);
	};
}


export function componentOf(name: string, html: string): HTMLComponent {
	class DummyComponent extends HTMLComponent {
		connectedCallback() {
			console.log(`${name} connected`);
		}

		static html() {
			return html;
		}
	}

	customElements.define(name, DummyComponent);
	console.log(`registered component ${name}`);
	return new DummyComponent();
}
