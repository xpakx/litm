import type { ComponentContext, ComponentDefinition, Service, WindowContext } from "../core/app.js";
import { HTMLComponent, register } from "../core/html-component.js";
import { signal } from "../core/signal.js";

@register('test-component')
export class TestComponent extends HTMLComponent {
	connectedCallback() {
		console.log('test-component connected');
	}

	static css() {
		return `
			:host { 
				display: flex; 
				justify-content: center;
				align-items: center;
				flex-direction: column;
			}
			h2 { 
				color: var(--highlight-blue);
			}
			p { font-style: italic; }

			#btn {
				background: none;
				border: none;
				cursor: pointer;
				margin-bottom: 15px;
				transition: transform 0.1s;
				font-family: 'Caveat', cursive;
				color: var(--text-dark);
				font-size: 32px;
				font-weight: 700;
				position: relative;
				display: inline-block;
				padding: 0 10px;
				z-index: 1;
			}

			#btn:active {
				transform: scale(0.95);
			}



			#btn::before {
				content: '';
				position: absolute;
				top: 15%;
				bottom: 10%;
				left: 0;
				right: 0;
				z-index: -1;
				border-radius: 3px 8px 4px 6px / 5px 3px 8px 4px; 
				opacity: 0.9;
				transition: background-color 0.3s ease;
				background-color: var(--highlight-yellow);
				transform: skewX(-4deg) rotate(-0.5deg);
			}
			`;
	}

	static html() {
		return `
		<h2>Hello World</h2>
		<p>Hello from web component.</p>
		<p id='count'>0</p>
		<button id='btn'>Click</button>
		`;
	}
}

class TestService implements Service {
	count = signal(10);

	onIncButton() {
		this.count.update((val: number) => {
			return val+1;
		});
	}

	init(ctx: ComponentContext): void {
		console.log(ctx.body);
		const body = ctx.body as TestComponent;
		body.bindContent('count', this.count);
		body.onClick('btn', () => this.onIncButton());
	}
}


export function testWindow(): ComponentDefinition {
	return {
		title: 'Hello world',
		width: 420, 
		height: 280,
		servicesFactory: () => [new TestService()],
		elementFactory: () => new TestComponent(),
	}
}

