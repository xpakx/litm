import { type Service, type WindowContext } from "./app.js";
import { EventBus } from "./event-bus.js";
import characterTemplate from './character.html'; 


interface Theme {
	name: string;
	powerTags: string[];
	weaknessTags: string[];
}

export interface Character {
	name : string;
	themes: Theme[];
}

class TagWindowService implements Service {
	character: Character;

	constructor(character: Character) {
		this.character = character;
	}

	private makeTag(tag: string, main: boolean = false): string {
		return `<div class="item-row ${main ? 'item-main' : 'item-sub'}">
			<span class="handwritten marker-yellow tag-btn"
			data-type="power" data-name="${tag}">
			${tag}
			</span>
			<svg class="scratch-icon" viewBox="0 0 24 24">
			<path d="M7,18 L11,4 M12,19 L16,5 M17,20 L21,6" stroke="#4a4239" stroke-width="1.8" stroke-linecap="round"/>
			</svg>
			</div>` 
	}

	private makeWeakness(tag: string): string {
		return `<div class="item-row item-sub">
			<span class="handwritten marker-peach tag-btn"
			data-type="weakness" data-name="${tag}">
			${tag}
			</span>
			</div>` 
	}


	private appendTheme(theme: Theme, container: HTMLElement) {
		let html = '';
		theme.powerTags.forEach((tag, index) => {
			html += this.makeTag(tag, index == 0);
		});

		theme.weaknessTags.forEach(tag => {
			html += this.makeWeakness(tag);
		});

		container.innerHTML = html;
	}

	onClick(container: HTMLElement, e: MouseEvent) {
		const target = e.target as HTMLElement;
		target.classList.toggle('selected');

		const selectedTags = Array.from(container.querySelectorAll('.tag-btn.selected')).map((el: any) => ({
			name: el.getAttribute('data-name'),
			type: el.getAttribute('data-type'),
			value: el.getAttribute('data-type') === 'power' ? 1 : -1
		}));

		// TODO: probably better to split in TAGS_ADD, and TAGS_REMOVE if we want more components
		EventBus.instance.emit('TAGS_UPDATED', selectedTags);
	}

	init(ctx: WindowContext): void {
		const container = ctx.body.querySelector('#items')! as HTMLElement;

		this.appendTheme(this.character.themes[0]!, container);

		const buttons = container.querySelectorAll('.tag-btn');
		buttons.forEach((elem: Element) => {
			const btn = elem as HTMLButtonElement;
			btn.addEventListener('click', (e: MouseEvent) => this.onClick(container, e));
		});
	}
}

export function characterWindow(x: number, y: number, character: Character): any {
	return {
		title: `Character: ${character.name}`,
		x: x,
		y: y,
		width: 320, 
		height: 450,
		template: characterTemplate,
		services: [new TagWindowService(character)]
    }
}
