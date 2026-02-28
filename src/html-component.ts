import { type WindowContext } from "./app.js";

export abstract class HTMLComponent extends HTMLElement {
    protected ui: ShadowRoot;
    public windowContext?: WindowContext;

    constructor() {
        super();
        this.ui = this.attachShadow({ mode: 'open' });
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
}

export function component(tagName: string) {
	return (constructor: CustomElementConstructor) => {
		if (customElements.get(tagName)) return;
		customElements.define(tagName, constructor);
		console.log(`registered component ${tagName}`);
	};
}


@component('test-component')
export class TestComponent extends HTMLComponent {
}
