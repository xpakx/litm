export interface SmartInputRule {
	typingPattern: RegExp;
	globalPattern: RegExp;
	render: (match: RegExpMatchArray, isTyping: boolean) => HTMLElement | null;
	onInsert?: (match: RegExpMatchArray, element: HTMLElement) => void;
}

export class SmartNoteHelper {
	rules: SmartInputRule[];

	constructor(rules: SmartInputRule[]) {
		this.rules = rules;
	}

	serializeDOM(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return (node.textContent || '').replace(/\u00A0/g, ' ');
		}
		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;

			if (el.hasAttribute('data-raw-text')) {
				return el.getAttribute('data-raw-text')!;
			}
			if (el.tagName === 'BR') return '\n';
			if (el.tagName === 'DIV') {
				const prefix = el.previousSibling ? '\n' : '';
				return prefix + Array.from(el.childNodes).map(n => this.serializeDOM(n)).join('');
			}
			return Array.from(el.childNodes).map(n => this.serializeDOM(n)).join('');
		}
		return '';
	}

	parseToNodes(text: string): Node[] {
		let currentText = text;
		const nodes: Node[] = [];

		while (currentText.length > 0) {
			let earliestMatch: { rule: SmartInputRule, match: RegExpMatchArray, index: number } | null = null;

			for (const rule of this.rules) {
				rule.globalPattern.lastIndex = 0;
				const match = rule.globalPattern.exec(currentText);
				if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
					earliestMatch = { rule, match, index: match.index };
				}
			}

			if (earliestMatch) {
				if (earliestMatch.index > 0) {
					nodes.push(document.createTextNode(currentText.substring(0, earliestMatch.index)));
				}

				const el = earliestMatch.rule.render(earliestMatch.match, false);
				if (el) {
					el.setAttribute('data-raw-text', earliestMatch.match[1]!);
					nodes.push(el);
				} else {
					nodes.push(document.createTextNode(earliestMatch.match[0]));
				}

				currentText = currentText.substring(earliestMatch.index + earliestMatch.match[0].length);
			} else {
				nodes.push(document.createTextNode(currentText));
				break;
			}
		}
		return nodes;
	}

	handleInput(getSelection: () => Selection | null) {
		const selection = getSelection();
		if (!selection || !selection.rangeCount) return
		const range = selection.getRangeAt(0);
		const node = range.endContainer;

		if (node.nodeType !== Node.TEXT_NODE) return;
		const cursorOffset = range.endOffset;
		const text = node.textContent;

		if (!text) return;
		const textBeforeCursor = text.substring(0, cursorOffset);

		if (!textBeforeCursor.match(/[\s\u00A0]$/)) return;
		for (const rule of this.rules) {
			const match = textBeforeCursor.match(rule.typingPattern);
			if (match && match.index !== undefined) {
				const elementToInsert = rule.render(match, true);
				if (elementToInsert) {
					this.insertElement(
						elementToInsert, 
						selection,
						rule,
						node,
						match,
						match.index
					)
					break; 
				}
			}
		}
	}

	insertElement(
		element: HTMLElement, selection: Selection, rule: SmartInputRule,
		node: Node, match: RegExpMatchArray, index: number
	) {

		element.setAttribute('data-raw-text', match[1]!);

		const fullMatchStr = match[0];
		let startOffset = index;

		if (fullMatchStr.match(/^[\s\u00A0]/)) startOffset += 1; 

		const replaceRange = document.createRange();
		replaceRange.setStart(node, startOffset);
		replaceRange.setEnd(node, index + fullMatchStr.length);
		replaceRange.deleteContents();

		replaceRange.insertNode(element);

		const spaceNode = document.createTextNode('\u00A0');
		replaceRange.setStartAfter(element);
		replaceRange.setEndAfter(element);
		replaceRange.insertNode(spaceNode);

		replaceRange.setStartAfter(spaceNode);
		replaceRange.setEndAfter(spaceNode);

		selection.removeAllRanges();
		selection.addRange(replaceRange);

		if (rule.onInsert) rule.onInsert(match, element);
	}
}
