import { type Service, type ComponentContext, type ComponentDefinition } from "../app.js";
import { componentOf, type HTMLComponent } from "../html-component.js";
import { computed, deepSignal, signal, type ReadonlySignal, type Signal } from "../signal.js";
import type { MusicData, Youtube } from "../youtube.js";
import musicTemplate from './music.html'; 

interface PlaylistElem {
	title?: string;
	artist?: string;
	active: boolean,
	ytId: string;
}


class MusicService implements Service {
	yt: Youtube;
	details = signal<MusicData>({artist: 'Unknown', title: 'Unknown'});
	artist = deepSignal(this.details, 'artist');
	title = deepSignal(this.details, 'title');
	playIcon: ReadonlySignal<string>;

	percentage?: ReadonlySignal<string>;
	playlist = signal<PlaylistElem[]>([]);
	currentIndex = signal(0);

	constructor(yt: Youtube) {
		this.yt = yt;
		this.playIcon = computed(() => this.yt.isPlaying() ? 'fa-pause' : 'fa-play', [this.yt.isPlaying]);
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
		component.bindDynamicClass('playIcon', this.playIcon);

		component.bindList('playlistContainer', this.playlist, (data) => this.playlistElem(data));
		this.playlist.set([
			{
				ytId: '',
				active: true,
			},
		]);
	}

	play() {
		const playing = this.yt.isPlaying();
		if (playing) {
			this.yt.pause();
			return;
		}
		this.yt.play();
		this.details.set(this.yt.getVideoDetails());
	}

	back() {
	}

	forward() {
	}

	playlistElem(song: PlaylistElem): HTMLElement {
		const div = document.createElement('div');
		const artist = song.artist ?? 'Unknown';
		const title = song.artist ?? 'Unknown';
		const text = `${artist} - ${title}`;
                div.className = `playlist-item ${song.active ? 'active' : ''}`;
		div.innerHTML = `<span class="playlist-text handwritten song-text">${text}</span>`
		return div;
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

