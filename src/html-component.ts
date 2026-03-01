import { type WindowContext } from "./app.js";

export abstract class HTMLComponent extends HTMLElement {
	protected ui: ShadowRoot;
	public windowContext?: WindowContext;
	protected static template?: HTMLTemplateElement;
	protected static stylesheet?: CSSStyleSheet;

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
}

export function register(tagName: string) {
	return (constructor: CustomElementConstructor) => {
		if (customElements.get(tagName)) return;
		customElements.define(tagName, constructor);
		console.log(`registered component ${tagName}`);
	};
}
