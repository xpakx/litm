import { type Service, type WindowContext } from "../app.js";
import { EventBus } from "../event-bus.js";
import { componentOf, deepSignal, HTMLComponent, signal } from "../html-component.js";
import characterTemplate from './character.html'; 


interface Theme {
	name: string;
	powerTags: string[];
	weaknessTags: string[];
	quest: string;
}

export interface Character {
	name : string;
	themes: Theme[];
}

interface Tag {
	name: string;
	weakness: boolean;
	main: boolean;
}

class TagWindowService implements Service {
	character: Character;

	container?: HTMLElement;
	theme = signal<Theme>({name: '', powerTags: [], weaknessTags: [], quest: ''});
	quest = deepSignal(this.theme, 'quest');
	tags = signal<Tag[]>([]);

	constructor(character: Character) {
		this.character = character;
	}
	
	tagComponent(tag: Tag): HTMLElement {
		const container = document.createElement('div');
		container.classList.add('item-row');
		if (tag.main) container.classList.add('item-main');
		else container.classList.add('item-sub');
		if (tag.weakness) container.classList.add('item-weakness');

		const emptyDiv = document.createElement('div');

		const span = document.createElement('span');
		span.classList.add('handwritten', 'tag-btn');
		if (tag.weakness) span.classList.add('marker-peach');
		else span.classList.add('marker-yellow');
		span.dataset.type = 'power';
		span.dataset.name = tag.name;
		span.textContent = tag.name;

		const svgNS = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNS, 'svg');
		svg.setAttribute('class', 'scratch-icon');
		svg.setAttribute('viewBox', '0 0 24 24');

		const path = document.createElementNS(svgNS, 'path');
		path.setAttribute('d', 'M7,18 L11,4 M12,19 L16,5 M17,20 L21,6');
		path.setAttribute('stroke', '#4a4239');
		path.setAttribute('stroke-width', '1.8');
		path.setAttribute('stroke-linecap', 'round');

		svg.append(path);

		container.append(emptyDiv, span, svg);

		return container;
	}

	init(ctx: WindowContext): void {
		this.container = ctx.body.querySelector('#items') as HTMLElement;

		const component = ctx.body as HTMLComponent;
		this.theme.set(this.character.themes[0]!);
		component.bindInput('quest-content', this.quest);
		this.quest.subscribe((t: string) => console.log(t));

		const tags: Tag[] = []
		this.theme().powerTags.forEach((name, index) => {
			tags.push({
				main: index == 0,
				weakness: false,
				name: name,
			});
		});
		this.theme().weaknessTags.forEach((name) => {
			tags.push({
				main: false,
				weakness: true,
				name: name,
			});
		});
		this.tags.set(tags);
		component.bindList('items', this.tags, (tag) => this.tagComponent(tag));
		component.onClick('items', (e: MouseEvent) => this.onItemClick(e)); 
	}

	onItemClick(event: MouseEvent) {
		if (!event.target) return;
		const targetElement = event.target as HTMLElement;
		const tag = targetElement.closest('.tag-btn');
		if (!tag) return;

		const test = tag.classList.toggle('selected');

		const busEvent = {
			name: tag.getAttribute('data-name'),
			type: tag.getAttribute('data-type'),
			value: tag.getAttribute('data-type') === 'power' ? 1 : -1
		};
		const eventKey = test ? 'TAG_ADDED' : 'TAG_REMOVED';
		EventBus.instance.emit(eventKey, busEvent);
	}
}

export function characterWindow(x: number, y: number, character: Character): any {
	return {
		title: `Character: ${character.name}`,
		x: x,
		y: y,
		width: 320, 
		height: 450,
		//template: characterTemplate,
		services: [new TagWindowService(character)],
		element: componentOf("win-char", characterTemplate),
    }
}
