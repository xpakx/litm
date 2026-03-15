import { type ComponentConfig, type ComponentContext, type Service, type WindowConfig } from "../app.js";
import { componentOf, HTMLComponent } from "../html-component.js";
import { deepSignal, signal } from "../signal.js";
import { tagComponent } from "../tag-component/tag-window.js";
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

class ThemeService implements Service {
	theme = signal<Theme>({name: '', powerTags: [], weaknessTags: [], quest: ''});
	quest = deepSignal(this.theme, 'quest');
	tags = signal<Tag[]>([]);
	newComponent?: (a: ComponentConfig) => HTMLElement;

	constructor(theme: Theme) {
		this.theme.set(theme);
	}
	
	tagComponent(tag: Tag): HTMLElement {
		// TODO: This would recreate all subcomponents on
		// change in tag list, we will probably want to 
		// improve bindList in the future and proxy with 
		// list of signals instead
		const config = tagComponent(signal(tag));
		// TODO: Not terribly happy with static call
		const elem = this.newComponent!(config);
		return elem;
	}

	init(ctx: ComponentContext): void {
		this.newComponent = (c) => ctx.app.registerComponent(c);
		const component = ctx.body as HTMLComponent;
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
	}
}

export function characterWindow(x: number, y: number, character: Character): WindowConfig {
	return {
		title: `Character: ${character.name}`,
		x: x,
		y: y,
		width: 320, 
		height: 450,
		//template: characterTemplate,
		services: [new ThemeService(character.themes[0]!)],
		element: componentOf("win-char", characterTemplate),
    }
}
