import { type Service, type ComponentContext, type ComponentDefinition } from "../app.js";
import { componentOf, type HTMLComponent } from "../html-component.js";
import type { Youtube } from "../youtube.js";
import musicTemplate from './music.html'; 

class MusicService implements Service {
	yt: Youtube;

	constructor(yt: Youtube) {
		this.yt = yt;
	}

	init(ctx: ComponentContext): void {
		const component = ctx.body as HTMLComponent;
		component.onClick('play', () => this.play());
	}

	play() {
		this.yt.play();
	}
}

export function musicComponent(yt: Youtube): ComponentDefinition {
	return {
		title: 'Music',
		width: 420, 
		height: 600,
		servicesFactory: () => [new MusicService(yt)],
		elementFactory: () => componentOf('win-music', musicTemplate),
	}
}

