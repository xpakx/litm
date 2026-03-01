import { HTMLComponent, register } from "./html-component.js";

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
		`;
	}
}


export function testWindow(x: number, y: number): any {
	return {
		title: 'Hello world',
		x: x,
		y: y,
		width: 420, 
		height: 280,
		services: [],
		element: new TestComponent(),
	}
}

