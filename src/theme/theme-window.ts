import { type ComponentConfig, type ComponentContext, type Service, type ComponentDefinition } from "../core/app.js";
import { componentOf, HTMLComponent } from "../core/html-component.js";
import { deepSignal, listSignal, signal, type Signal } from "../core/signal.js";
import { tagComponent } from "../tag-component/tag-window.js";
import themeTemplate from './theme.html'; 

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
	theme: Signal<Theme>;
	quest: Signal<string>;
	tags = listSignal<Tag>([]);
	newComponent?: (a: ComponentConfig) => HTMLElement;

	constructor(theme: Signal<Theme>) {
		this.theme = theme;
		this.quest = deepSignal(this.theme, 'quest');
	}
	
	tagComponent(tag: Tag): HTMLElement {
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

export function themeWindow(): ComponentDefinition {
	return {
		title: "Theme",
		width: 320, 
		height: 450,
		//template: characterTemplate,
		servicesFactory: (args?: Record<string, any>) => [new ThemeService(
			args?.['theme'] ?? signal({name: '', powerTags: [], weaknessTags: [], quest: ''})
		)],
		elementFactory: () => componentOf("win-theme", themeTemplate),
    }
}
