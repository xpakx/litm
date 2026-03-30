import type { Service } from "./app.js";
import type { HTMLComponent } from "./html-component.js";
import type { ReadonlySignal, Signal } from "./signal.js";

export type Binding = 
  | { kind: 'attribute', elem: string, attr: string, signal: string }
  | { kind: 'class', elem: string, signal: string }
  | { kind: 'content', elem: string, signal: string } 
  | { kind: 'action', elem: string, function: string, action: {action: "click"} | {action: string, trigger: string} };


export class BindingManager {
	bind(service: Service, component: HTMLComponent) {
		const signalFields = this.getSignalFields(service);
		console.log(signalFields);
		const methods = this.getMethods(service);
		console.log(methods);

		const ComponentClass = component.constructor as typeof HTMLComponent;
		const bindings = ComponentClass.bindings();
		bindings.forEach((b) => this.bindSignal(service, b, component, signalFields, methods));
	}

	isSignal(val: any): val is Signal<any> {
		return (
			typeof val === 'function' &&
				typeof val.set === 'function' &&
				typeof val.update === 'function' &&
				typeof val.subscribe === 'function'
		);
	}

	isReadOnlySignal(val: any): val is ReadonlySignal<any> {
		return (
			typeof val === 'function' &&
				typeof val.subscribe === 'function'
		);
	}

	getSignalFields(obj: Record<string, any>): Record<string, Signal<any>> {
		const result: Record<string, Signal<any>> = {};

		for (const [key, value] of Object.entries(obj)) {
			if (this.isSignal(value)) {
				result[key] = value;
			}
		}

		return result;
	}


	bindSignal(
		service: Service,
		binding: Binding,
		component: HTMLComponent,
		signals: Record<string, Signal<any>>,
		actions: Record<string, Function>,
	) {
		switch (binding.kind) {
			case 'attribute':  {
				console.log(`Binding ${binding.attr} on ${binding.elem}`);
				const signal = signals[binding.signal];
				if(!signal) return;
				component.bindAttribute(
					binding.elem,
					binding.attr,
					signal
				);
			}
			break;

			case 'class': {
				console.log(`Binding class on ${binding.elem}`);
				const signal = signals[binding.signal];
				if(!signal) return;
				component.bindDynamicClass(
					binding.elem,
					signal
				);
			}
			break;

			case 'content': {
				console.log(`Binding content for ${binding.elem}`);
				const signal = signals[binding.signal];
				if(!signal) return;
				component.bindContent(
					binding.elem,
					signal
				);
			}
			break;

			case 'action':
				switch (binding.action.action) {
				case 'click': {
					console.log("Binding click action");
					const func = actions[binding.function];
					if(!func) return;
					component.onClick(
						binding.elem,
						func.bind(service)
					);
				}

				break;
				case 'trigger':
					console.log(`Biding trigger: ${binding.action.trigger}`);
				break;
				}
			break;
		}
	}

	getMethods(obj: any): Record<string, Function> {
		const actions: Record<string, Function> = {};

		const proto = Object.getPrototypeOf(obj);

		const props = Object.getOwnPropertyNames(proto).filter(prop => {
			if (prop === 'constructor' || prop.startsWith('_')) return false;

			const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
			return descriptor && typeof descriptor.value === 'function';
		});

		for (const key of props) {
			const value = obj[key];
			if (!actions[key]) actions[key] = value;
		}

		return actions;
	}
}
