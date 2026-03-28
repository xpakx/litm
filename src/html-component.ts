import { type WindowContext } from "./app.js";
import type { Binding } from "./bindings.js";
import type { ReadonlySignal, Signal, Trigger } from "./signal.js";
import { SmartNoteHelper, type SmartInputRule } from "./smart-note-helper.js";

export abstract class HTMLComponent extends HTMLElement {
	protected ui: ShadowRoot;
	public windowContext?: WindowContext;
	protected static template?: HTMLTemplateElement;
	protected static stylesheet?: CSSStyleSheet;
	private _elements: Map<string, HTMLElement> = new Map();

	private _unsubscribers: Array<() => void> = [];
	private _eventListeners: Array<{elem: HTMLElement, name: string, fn: EventListener}> = [];
	permanent: boolean = false;

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

	static bindings(): Binding[] {
		return [];
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

	onClick(name: string, func: (() => void) | ((e: MouseEvent) => void)) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.addEventListener('click', func);
		this._eventListeners.push({ elem, name: 'click', fn: func as EventListener });
	}

	pokeAnimation(name: string, cls: string) {
		const elem = this.getById(name);
		if (!elem) return;
		elem.classList.remove(cls);
		void elem.offsetWidth;
		elem.classList.add(cls);
	}

	// 'true' signals
	
	bindContent(name: string, signal: Signal<any> | ReadonlySignal<any>) {
		const elem = this.getById(name);
		if (!elem) return;
		const unsub = signal.subscribe(val => elem.textContent = val.toString());
		this._unsubscribers.push(unsub);
	}

	bindDynamicClass(name: string, signal: Signal<string> | ReadonlySignal<string>) {
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

	bindClass(name: string, cls: string, signal: Signal<boolean> | ReadonlySignal<boolean>) {
		const elem = this.getById(name);
		if (!elem) return;

		const unsub = signal.subscribe(state => {
			if (state) elem.classList.add(cls);
			else elem.classList.remove(cls);
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
	
	bindListSmart<T>(name: string, signal: Signal<T[]>, renderFn: (item: T, index: number) => HTMLElement) {
		const container = this.getById(name);
		if (!container) return;
		const itemList: ListElem<T>[] = [];

		const unsub = signal.subscribe(items => {
			items.forEach((item, index) => {
				const old = itemList[index]; 
				if (old && old.data !== item) {
					old.data = item;
					const newElem = renderFn(item, index);
					old.elem.replaceWith(newElem);
					old.elem = newElem;
				} else if (!old) {
					const newElem = renderFn(item, index);
					container.appendChild(newElem);
					itemList.push({ data: item, elem: newElem });
				}
			});
			while (itemList.length > items.length) {
				const orphanedItem = itemList.pop();
				if (orphanedItem) orphanedItem.elem.remove();
			}
		});

		this._unsubscribers.push(unsub);
	}

	bindAnimation(name: string, animationClass: string, source: Trigger, animationName?: string) {
		const elem = this.getById(name);
		if (!elem) return;

		function onAnimationEnd(event: AnimationEvent) {
			if (animationName && event.animationName !== animationName) return;
			elem!.classList.remove(animationClass);
			elem!.onanimationend = null;
		}

		const unsub = source.subscribe(() => {
			elem.classList.remove(animationClass);
			void elem.offsetWidth; // force reflow
			elem.classList.add(animationClass);
			elem.onanimationend = (event) => onAnimationEnd(event);
		});

		this._unsubscribers.push(unsub);
	}

	bindAttribute(name: string, attr: string, signal: Signal<string | boolean | null>) {
		const elem = this.getById(name);
		if (!elem) return;

		const unsub = signal.subscribe(val => {
			if (val === false || val === null) {
				elem.removeAttribute(attr);
			} else {
				elem.setAttribute(attr, val === true ? '' : val.toString());
			}
		});

		this._unsubscribers.push(unsub);
	}

	private bindInputElem(elem: HTMLInputElement, signal: Signal<string>) {
		const inputHandler = (e: Event) => signal.set((e.target as HTMLInputElement).value);
		elem.addEventListener('input', inputHandler);
		this._eventListeners.push({ elem, name: 'input', fn: inputHandler });

		const unsub = signal.subscribe(val => {
			if (elem.value !== val) elem.value = val;
		});

		this._unsubscribers.push(unsub);
	}

	private bindContentEditable(elem: HTMLElement, signal: Signal<string>) {
		const inputHandler = (_e: Event) => signal.set(elem.innerText);
		elem.addEventListener('input', inputHandler);
		this._eventListeners.push({ elem, name: 'input', fn: inputHandler });

		const unsub = signal.subscribe(val => {
			if (elem.innerText !== val) elem.innerText = val;
		});

		this._unsubscribers.push(unsub);
	}

	bindInput(name: string, signal: Signal<string>) {
		const elem = this.getById(name);
		if (!elem) return;

		if (elem.isContentEditable) {
			this.bindContentEditable(elem, signal);
		} else {
			this.bindInputElem(elem as HTMLInputElement, signal);
		}
	}


	bindSmartInput(name: string, signal: Signal<string>, rules: SmartInputRule[]) {
		const elem = this.getById(name);
		if (!elem || !elem.isContentEditable) return;
		
		const smartNote = new SmartNoteHelper(rules);

		let isUpdatingSignal = false;

		const getSelection = (): Selection | null => {
			if (typeof (this.ui as any).getSelection === 'function') {
				return (this.ui as any).getSelection();
			}
			return window.getSelection();
		};

		const inputHandler = (_e: Event) => {
			smartNote.handleInput(getSelection);
			isUpdatingSignal = true;
			signal.set(smartNote.serializeDOM(elem));
			isUpdatingSignal = false;
		};

		elem.addEventListener('input', inputHandler);
		this._eventListeners.push({ elem, name: 'input', fn: inputHandler });

		const unsub = signal.subscribe(val => {
			if (isUpdatingSignal) return;
			const parsedNodes = smartNote.parseToNodes(val);
			elem.replaceChildren(...parsedNodes);
		});

		this._unsubscribers.push(unsub);
	}

	// CLEANUP
	disconnectedCallback() {
		console.log("Disconnected");
		if (!this.permanent) this.destroy();
	}

	destroy() {
		console.log("Destroying")
		this._unsubscribers.forEach(unsub => unsub());
		this._unsubscribers = [];

		this._eventListeners.forEach(({elem, name, fn}) => {
			elem.removeEventListener(name, fn);
		});
		this._eventListeners = [];
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

interface ListElem<T> {
	elem: HTMLElement;
	data: T,
}
