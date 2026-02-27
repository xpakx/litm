import { type WindowContext, type Service } from "./app.js";
import { EventBus } from "./event-bus.js";
import smartNoteTemplate from './smart-note.html'; 

class SmartNoteService implements Service {
	smartNoteEditor?: HTMLElement;
	editor?: HTMLElement;


	focusEditor() {
		if (!this.editor) return;
                this.editor.focus();
	}

	init(ctx: WindowContext): void {
		this.smartNoteEditor = ctx.body.querySelector('#smart-note-editor') as HTMLElement;
		this.editor = document.getElementById('smart-editor') as HTMLElement;

		this.smartNoteEditor.addEventListener('click', () => this.focusEditor());
	}
}

export function smartNoteWindow(x: number, y: number): any {
	return {
		title: 'Smart Note',
		x: x,
		y: y,
		width: 300, 
		height: 450,
		template: smartNoteTemplate,
		services: [new SmartNoteService()]
	}
}
