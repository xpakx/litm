import type { ComponentContext, ComponentDefinition, Service, WindowContext } from "./app.js";
import type { Binding } from "./bindings.js";
import { HTMLComponent, register } from "./html-component.js";
import { signal } from "./signal.js";

@register('test-hello')
class HelloComponent extends HTMLComponent {
    static html(): string {
        return '<div id="target"></div><span id="gen-id-1">Simple text</span>';
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
                    "action": "trigger",
                    "trigger": "event"
                },
                "elem": "target",
                "function": "run()"
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
	data = signal('content');
	init(ctx: ComponentContext): void {
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
