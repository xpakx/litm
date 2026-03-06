import { type WindowContext, type Service, type WindowConfig } from "../app.js";
import { EventBus } from "../event-bus.js";
import { componentOf, HTMLComponent } from "../html-component.js";
import {  signal } from "../signal.js";
import smartNoteTemplate from './smart-note.html'; 

class SmartNoteService implements Service {
	editor?: HTMLElement;
	input = signal("The village is -bewitched-2 and -cold but +reliable soldiers are here.");

	init(ctx: WindowContext): void {
		const component = ctx.body as HTMLComponent;
		this.input.subscribe(val => console.log(val));

		component.onClick(
			'smart-editor', 
			(event: MouseEvent) => this.onItemClick(event)
		);

		component.bindSmartInput('smart-editor', this.input, [
			{
				typingPattern: /(?:^|\s|[\u00A0])(([+-])([a-zA-Z0-9_]+)(?:-(\d+))?)[\s\u00A0]$/,
				globalPattern: /(([+-])([a-zA-Z0-9_]+)(?:-(\d+))?)/g,
				render: (match, isTyping) => this.render(match, isTyping),
				onInsert: (match) => this.onInsert(match)
			}
		]);
	}

	onInsert(match: RegExpMatchArray) {
		const positive = match[2] !== '-';
		const label = match[3]!;
		const value = match[4];
		console.log(label, positive? 'power' : 'weakness', value);
	}

	render(match: RegExpMatchArray, _isTyping: boolean): HTMLElement | null {
		const positive = match[2] !== '-';
		const label = match[3];
		const value = match[4];

		if (!label) return null;

		const wrapper = document.createElement('span');
		wrapper.contentEditable = "false";
		wrapper.className = "smart-tag-wrapper";

		let styleClass = positive ? "style-pos" : "style-neg";
		if (value) styleClass = "style-status";

		wrapper.classList.add(styleClass);

		const textSpan = document.createElement('span');
		textSpan.className = "marker-text";
		textSpan.innerText = label;
		wrapper.dataset.name = label;
		wrapper.dataset.type = positive ? 'power' : 'weakness';
		wrapper.dataset.power = value ?? '1';
		wrapper.appendChild(textSpan);

		return wrapper;
	}


	onItemClick(event: MouseEvent) {
		if (!event.target) return;
		const targetElement = event.target as HTMLElement;
		const tag = targetElement.closest('.smart-tag-wrapper');
		if (!tag) return;

		const test = tag.classList.toggle('selected');
		let power = 1;
		const powerAttr = tag.getAttribute('data-power');
		if (powerAttr !== null) power = parseInt(powerAttr);
		const type = tag.getAttribute('data-type');
		if (type !== 'power') power *= -1;

		const busEvent = {
			name: tag.getAttribute('data-name'),
			type: type,
			value: power,
		};
		const eventKey = test ? 'tag:add' : 'tag:remove';
		console.log(busEvent);
		EventBus.instance.emit(eventKey, busEvent);
	}
}

export function smartNoteWindow(x: number, y: number): WindowConfig {
	return {
		title: 'Smart Note',
		x: x,
		y: y,
		width: 300, 
		height: 450,
		// template: smartNoteTemplate,
		services: [new SmartNoteService()],
		element: componentOf('win-note', smartNoteTemplate),
	}
}
