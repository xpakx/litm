import { HTMLComponent, register } from "./html-component.js";

@register('test-component')
export class TestComponent extends HTMLComponent {
	constructor() {
		super();
	}

	connectedCallback() {
		console.log('test-component connected');
	}

	static html() {
		return `<p>
		Hello World
		</p>`;
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

