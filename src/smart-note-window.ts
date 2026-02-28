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
		this.editor.addEventListener('input', (e: Event) => this.onInput(e as InputEvent))
	}

	onInput(_event: InputEvent) {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const node = range.endContainer;
            if (node.nodeType !== Node.TEXT_NODE) return;

            const text = node.textContent;
	    if (!text) return;
            
	    // TODO: on paste, on comma, etc.
            if (!text.endsWith('\u00A0') && !text.endsWith(' ')) return;
            const regex = /(?:^|\s|[\u00A0])([+-])([a-zA-Z0-9_]+)(?:-(\d+))?[\s\u00A0]$/;
            
            const match = text.match(regex);

            if (match) {
                const fullMatch = match[0];
                const type = match[1];
                const label = match[2];
                const value = match[3];
		console.log(fullMatch);
            }
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
