import { type WindowContext, type Service, type WindowConfig } from "../app.js";
import { EventBus } from "../event-bus.js";
import { componentOf, HTMLComponent, signal } from "../html-component.js";
import smartNoteTemplate from './smart-note.html'; 

class SmartNoteService implements Service {
	editor?: HTMLElement;
	input = signal('');


	focusEditor() {
		if (!this.editor) return;
                this.editor.focus();
	}

	init(ctx: WindowContext): void {
		const component = ctx.body as HTMLComponent;

		// this.smartNoteEditor.addEventListener('click', () => this.focusEditor());
		component.bindInput('smart-editor', this.input);
		this.input.subscribe(
			() => this.onInput()
		);
	}

	onInput(_event?: InputEvent) {
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
                const positive = match[1] != '-';
                const label = match[2];
                const value = match[3];
		console.log(fullMatch);
		console.log(positive, label, value);
		if (!label) return;
                this.createSmartTag(node, match, positive, label, value);

            }
        }

        createSmartTag(textNode: Node, match: RegExpMatchArray, positive: boolean, label: string, value?: string) {
		const range = document.createRange();
		const selection = window.getSelection();

		const matchIndex = match.index;
		if (matchIndex === undefined) return;
		const fullMatchStr = match[0];

		let startOffset = matchIndex;
		if (fullMatchStr.match(/^[\s\u00A0]/)) {
			startOffset += 1; 
		}

		range.setStart(textNode, startOffset);
		range.setEnd(textNode, matchIndex + fullMatchStr.length);
		range.deleteContents();

		const wrapper = document.createElement('span');
		wrapper.contentEditable = "false";
		wrapper.className = "smart-tag-wrapper";

		let styleClass = "style-pos";
		if (value) styleClass = "style-status";
		else if (!positive) styleClass = "style-neg";

		wrapper.classList.add(styleClass);

		const textSpan = document.createElement('span');
		textSpan.className = "marker-text";
		textSpan.innerText = label;
		wrapper.appendChild(textSpan);

		range.insertNode(wrapper);

		const spaceNode = document.createTextNode('\u00A0');
		range.setStartAfter(wrapper);
		range.setEndAfter(wrapper);
		range.insertNode(spaceNode);

		range.setStartAfter(spaceNode);
		range.setEndAfter(spaceNode);

		if (!selection) return;
		selection.removeAllRanges();
		selection.addRange(range);
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
