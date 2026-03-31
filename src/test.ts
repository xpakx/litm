import type { ComponentContext, ComponentDefinition, Service, WindowContext } from "./core/app.js";
import type { Binding } from "./core/bindings.js";
import { HTMLComponent, register } from "./core/html-component.js";
import { signal } from "./core/signal.js";

@register('test-hello')
class HelloComponent extends HTMLComponent {
    static html(): string {
        return `<div id="target"></div>
	<button id="button">Click</button>`;
    }

    static bindings(): Binding[] {
        return [
            {
                "kind": "attribute",
                "elem": "target",
                "attr": "attr",
                "signal": "val"
            },
            {
                "kind": "action",
                "action": {
                    "action": "click",
                },
                "elem": "button",
                "function": "run"
            },
            {
                "kind": "content",
                "elem": "target",
                "signal": "data"
            }
        ];
    }
}

export class TestService implements Service {
	val = signal('test');
	data = signal(0);
	init(ctx: ComponentContext): void {
	}

	run() {
		console.log("click");
		this.data.update((i) => i+1);
	}
}


export function bindingTestWindow(): ComponentDefinition {
	return {
		title: 'Testing Component',
		width: 300, height: 450,
		servicesFactory: () => [new TestService()],
		elementFactory: () => new HelloComponent(),
	}
}
