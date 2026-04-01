import { type ComponentConfig, type ComponentContext, type Service, type WindowConfig, type ComponentDefinition } from "../core/app.js";
import { componentOf, HTMLComponent } from "../core/html-component.js";
import { deepSignal, listSignal, signal } from "../core/signal.js";
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
	tags = listSignal<Tag>([]);
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
		const elem = this.newComponent!(config);
		return elem;
	}

	init(ctx: ComponentContext): void {
		this.newComponent = (c) => ctx.app.createComponent(c);
		const component = ctx.body as HTMLComponent;
		component.bindInput('quest-content', this.quest);
		this.quest.subscribe((t: string) => console.log(t));

		this.theme().powerTags.forEach((name, index) => {
			this.tags.push({
				main: index == 0,
				weakness: false,
				name: name,
			});
		});
		this.theme().weaknessTags.forEach((name) => {
			this.tags.push({
				main: false,
				weakness: true,
				name: name,
			});
		});
		component.bindList('items', this.tags, (tag) => this.tagComponent(tag));
	}
}

export function characterWindow(character: Character): ComponentDefinition {
	return {
		title: `Character: ${character.name}`,
		width: 320, 
		height: 450,
		//template: characterTemplate,
		servicesFactory: () => [new ThemeService(character.themes[0]!)],
		elementFactory: () => componentOf("win-char", characterTemplate),
    }
}
