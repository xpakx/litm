import { type ComponentConfig, type ComponentContext, type Service, type ComponentDefinition } from "../core/app.js";
import { componentOf, HTMLComponent } from "../core/html-component.js";
import { listSignal, objectSignal, signal, type Signal } from "../core/signal.js";
import characterTemplate from './character.html'; 

interface Theme {
	name: string;
	powerTags: string[];
	weaknessTags: string[];
	quest: string;
}

interface Character {
	name : string;
	themes: Theme[];
}

interface Tag {
	name: string;
	weakness: boolean;
	main: boolean;
}

class CharacterService implements Service {
	character = objectSignal<Character>({name: '', themes: []});
	name = this.character.getFieldSignal("name");
	themes = listSignal<Theme>([]);
	openWindow?: (name: string, theme: Signal<Theme>) => void;

	constructor(character: Character) {
		this.character.set(character);
		this.themes.set(character.themes);
	}
	
	themeComponent(theme: Theme): HTMLElement {
		const elem = document.createElement('button');
		elem.innerText = theme.name;
		elem.onclick = () => this.openWindow!('theme', signal(theme));
		return elem;
	}

	init(ctx: ComponentContext): void {
		this.openWindow = (name, theme) => ctx.app.openWindow(name, 0, 0, undefined, {'theme': theme});
		const component = ctx.body as HTMLComponent;
		component.bindContent('character-name', this.name);
		component.bindListSmart('themes', this.themes, (theme) => this.themeComponent(theme));
	}
}

export function characterWindow(character: Character): ComponentDefinition {
	return {
		title: `Character: ${character.name}`,
		width: 320, 
		height: 450,
		servicesFactory: () => [new CharacterService(character)],
		elementFactory: () => componentOf("win-character", characterTemplate),
    }
}
