import { type WindowContext } from "./app.js";

export interface Signal<T> {
	(): T;
	set(value: T): void;
	update(fn: (v: T) => T): void;
	subscribe(fn: (v: T) => void): () => void;
}

export function signal<T>(initialValue: T): Signal<T> {
	let _value = initialValue;
	const _subscribers = new Set<(v: T) => void>();

	const signal = (() => {
		return _value;
	}) as Signal<T>;

	signal.set = (newValue: T) => {
		if (_value === newValue) return;
		_value = newValue;
		_subscribers.forEach(fn => fn(_value));
	};

	signal.update = (updater: (v: T) => T) => {
		signal.set(updater(_value));
	};

	signal.subscribe = (fn: (v: T) => void) => {
		_subscribers.add(fn);
		fn(_value);
		return () => _subscribers.delete(fn);
	};

	return signal;
}

export interface Trigger {
	(): void;
	subscribe(fn: () => void): () => void;
}

export function trigger(): Trigger {
	const _subscribers = new Set<() => void>();

	const t = (() => {
		_subscribers.forEach(fn => fn());
	}) as Trigger;

	t.subscribe = (fn: () => void) => {
		_subscribers.add(fn);
		return () => _subscribers.delete(fn);
	};

	return t;
}

export interface ReadonlySignal<T> {
	(): T;
	subscribe(fn: (v: T) => void): () => void;
}

export function computed<T>(computeFn: () => T, dependencies: Signal<any>[]): ReadonlySignal<T> {
	let _value = computeFn();
	const _subscribers = new Set<(v: T) => void>();

	const compSignal = (() => _value) as ReadonlySignal<T>;

	const update = () => {
		const newValue = computeFn();
		if (_value !== newValue) {
			_value = newValue;
			_subscribers.forEach(fn => fn(_value));
		}
	};

	dependencies.forEach(dep => dep.subscribe(update));

	compSignal.subscribe = (fn: (v: T) => void) => {
		_subscribers.add(fn);
		fn(_value);
		return () => _subscribers.delete(fn);
	};

	return compSignal;
}

export abstract class HTMLComponent extends HTMLElement {
	protected ui: ShadowRoot;
	public windowContext?: WindowContext;
	protected static template?: HTMLTemplateElement;
	protected static stylesheet?: CSSStyleSheet;
	private _elements: Map<string, HTMLElement> = new Map();
	private _unsubscribers: Array<() => void> = [];

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

	emit<T = unknown>(eventName: string, payload?: T) {
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

	onClick(name: string, func: () => void) {
		this.ui.getElementById(name)?.addEventListener('click', func);
	}

	pokeAnimation(name: string, cls: string) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.classList.remove(cls);
		void elem.offsetWidth;
		elem.classList.add(cls);
	}

	// 'true' signals
	
	bindContent(name: string, signal: Signal<any>) {
		const elem = this.getById(name);
		if (!elem) return;
		const unsub = signal.subscribe(val => elem.textContent = val.toString());
		this._unsubscribers.push(unsub);
	}

	bindDynamicClass(name: string, signal: Signal<string>) {
		const elem = this.getById(name);
		if (!elem) return;

		let lastClass = "";
		const unsub = signal.subscribe(currentClass => {
			if (lastClass) elem.classList.remove(lastClass);
			if (currentClass) elem.classList.add(currentClass);
			lastClass = currentClass;
		});

		this._unsubscribers.push(unsub);
	}

	bindStyle(name: string, property: keyof CSSStyleDeclaration, signal: Signal<string> | ReadonlySignal<string>) {
		const elem = this.getById(name);
		if (!elem) return;

		const unsub = signal.subscribe(value => {
			elem.style.setProperty(property as string, value);
		});

		this._unsubscribers.push(unsub);
	}

	// ????
	bindList<T>(name: string, signal: Signal<T[]>, renderFn: (item: T, index: number) => HTMLElement) {
		const container = this.getById(name);
		if (!container) return;

		const unsub = signal.subscribe(items => {
			container.replaceChildren(); 

			items.forEach((item, index) => {
				container.appendChild(renderFn(item, index));
			});
		});

		this._unsubscribers.push(unsub);
	}

	bindAnimation(name: string, animationClass: string, source: Trigger) {
		const elem = this.getById(name);
		if (!elem) return;

		const unsub = source.subscribe(() => {
			elem.classList.remove(animationClass);
			void elem.offsetWidth; // force reflow
			elem.classList.add(animationClass);
		});

		this._unsubscribers.push(unsub);
	}

	bindAttribute(name: string, attr: string, signal: Signal<string | boolean | null>) {
		const elem = this.getById(name);
		if (!elem) return () => {};

		const unsub = signal.subscribe(val => {
			if (val === false || val === null) {
				elem.removeAttribute(attr);
			} else {
				elem.setAttribute(attr, val === true ? '' : val.toString());
			}
		});

		this._unsubscribers.push(unsub);
	}

	bindInput(name: string, signal: Signal<string>) {
		const elem = this.getById(name) as HTMLInputElement;
		if (!elem) return () => {};

		const inputHandler = (e: Event) => signal.set((e.target as HTMLInputElement).value);
		elem.addEventListener('input', inputHandler);

		const unsub = signal.subscribe(val => {
			if (elem.value !== val) elem.value = val;
		});

		this._unsubscribers.push(unsub);
	}

	// CLEANUP
	disconnectedCallback() {
		this._unsubscribers.forEach(unsub => unsub());
		this._unsubscribers = [];
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
	if (customElements.get(name)) {
		const ExistingClass = customElements.get(name) as CustomElementConstructor;
		return new ExistingClass() as HTMLComponent;
	}

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
