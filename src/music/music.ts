import { type Service, type ComponentContext, type ComponentDefinition } from "../app.js";
import { componentOf, type HTMLComponent } from "../html-component.js";
import { computed, deepSignal, signal, type ReadonlySignal, type Signal } from "../signal.js";
import type { MusicData, Youtube } from "../youtube.js";
import musicTemplate from './music.html'; 

class MusicService implements Service {
	yt: Youtube;
	details = signal<MusicData>({artist: 'Unknown', title: 'Unknown'});
	artist = deepSignal(this.details, 'artist');
	title = deepSignal(this.details, 'title');

	percentage?: ReadonlySignal<string>;

	constructor(yt: Youtube) {
		this.yt = yt;
	}

	init(ctx: ComponentContext): void {
		const component = ctx.body as HTMLComponent;
		component.onClick('play', () => this.play());
		component.onClick('backward', () => this.back());
		component.onClick('forward', () => this.forward());
		component.bindContent('mainArtist', this.artist);
		component.bindContent('mainTitle', this.title);
		
		this.percentage = computed(
			() => {
				if (this.yt.totalTime() == 0) return "0%";
				const perc = 100*(this.yt.currentTime() / this.yt.totalTime());
				return `${perc}%`
			},
			[this.yt.currentTime, this.yt.totalTime]
		);
		component.bindStyle('progressBar', 'width', this.percentage);
	}

	play() {
		this.yt.play();
		this.details.set(this.yt.getVideoDetails());
	}

	back() {
	}

	forward() {
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

