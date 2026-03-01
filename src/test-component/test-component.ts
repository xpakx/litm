import type { WindowContext } from "../app.js";
import { HTMLComponent, register, signal } from "../html-component.js";

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
			`;
	}

	static html() {
		return `
		<h2>Hello World</h2>
		<p>Hello from web component.</p>
		<p id='count'>0</p>
		<button id='btn'>click</button>
		`;
	}
}

class TestService {
	count = signal(10);

	onIncButton() {
		this.count.update((val: number) => {
			return val+1;
		});
	}

	init(ctx: WindowContext): void {
		console.log(ctx.body);
		const body = ctx.body as TestComponent;
		body.bindContent('count', this.count);
		body.onClick('btn', () => this.onIncButton());
	}
}


export function testWindow(x: number, y: number): any {
	return {
		title: 'Hello world',
		x: x,
		y: y,
		width: 420, 
		height: 280,
		services: [new TestService()],
		element: new TestComponent(),
	}
}

