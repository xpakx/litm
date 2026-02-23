import { type Service, type WindowContext } from "./app.js";
import { EventBus } from "./event-bus.js";


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

	private appendTheme(theme: Theme, container: HTMLElement) {
		const themeEl = document.createElement('div');
		themeEl.style.marginBottom = '15px';

		let html = `<h4 style="margin: 0 0 5px 0; color: #cdd6f4;">${theme.name}</h4><div style="display: flex; flex-wrap: wrap; gap: 5px;">`;

		theme.powerTags.forEach(tag => {
			html += `<button class="tag-btn power-tag" data-type="power" data-name="${tag}">${tag}</button>`;
		});

		theme.weaknessTags.forEach(tag => {
			html += `<button class="tag-btn weakness-tag" data-type="weakness" data-name="${tag}">${tag}</button>`;
		});

		html += `</div>`;
		themeEl.innerHTML = html;
		container.appendChild(themeEl);
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
		const container = ctx.body.querySelector('#char-sheet')! as HTMLElement;

		this.character.themes.forEach(theme => this.appendTheme(theme, container));

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
		template: `<div id="char-sheet" style="padding: 10px; overflow-y: auto; height: 100%; box-sizing: border-box;"></div>`,
		services: [new TagWindowService(character)]
    }
}
