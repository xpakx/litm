import { type Service, type ComponentContext, type ComponentDefinition } from "../core/app.js";
import { componentOf, type HTMLComponent } from "../core/html-component.js";
import { computed, deepSignal, listSignal, signal, type ReadonlySignal, type Signal } from "../core/signal.js";
import type { MusicData, Youtube } from "../youtube.js";
import musicTemplate from './music.html'; 

interface PlaylistElem {
	ytId: string;
	title: string;
	artist: string;
	active: boolean,
}


class MusicService implements Service {
	yt: Youtube;
	currentIndex = signal(0);
	artist: ReadonlySignal<string>;
	title: ReadonlySignal<string>;
	playIcon: ReadonlySignal<string>;

	percentage?: ReadonlySignal<string>;
	playlist = listSignal<PlaylistElem>([]);
	initialized: boolean = false;

	currentTime: ReadonlySignal<string>;
	duration: ReadonlySignal<string>;

	constructor(yt: Youtube) {
		this.yt = yt;
		this.playIcon = computed(() => this.yt.isPlaying() ? 'fa-pause' : 'fa-play', [this.yt.isPlaying]);
		this.artist = computed(() => this.yt.artist() ?? '???', [this.yt.artist]);
		this.title = computed(() => this.yt.title() ?? '???', [this.yt.title]);

		this.currentTime = computed(() => this.formatSecToTime(this.yt.currentTime()), [this.yt.currentTime])
		this.duration = computed(() => this.formatSecToTime(this.yt.totalTime()), [this.yt.totalTime])
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
		component.bindContent('currentTime', this.currentTime);
		component.bindContent('duration', this.duration);

		component.bindListSmart('playlistContainer', this.playlist, (data, _) => this.playlistElem(data));
		this.playlist.push({
			ytId: 'krGs2V3Vk3w',
			active: true,
			artist: "???",
			title: "???",
		});
		this.playlist.push({
			ytId: 'd3ioWB3RBYY',
			active: false,
			artist: "???",
			title: "???",
		});

		this.yt.whenReady(() => this.updateList());
	}

	updateList() {
		const playlist = [...this.playlist()];
		const list = playlist.map((a) => a.ytId);
		this.yt.select(list);
		this.yt.getPlaylistData(list)
			.then((list) => {
				console.log(list)
				list.forEach((elem, i) => {
					this.playlist.updateAt(i, (e) => {
						return {
							title: elem.title,
							artist: elem.artist,
							ytId: e.ytId,
							active: e.active
						};
					})
				});
			});
		this.initialized = true;
	}

	play() {
		const playing = this.yt.isPlaying();
		if (playing) {
			this.yt.pause();
			return;
		}
		this.yt.play();
	}

	back() {
		let num = this.currentIndex() - 1;
		const list = this.playlist();
		if (list.length == 0) return;
		if (num < 0) return;
		const current = list[num];
		if (!current) return;
		this.currentIndex.set(num);
		this.yt.selectInPlaylist(num)
	}

	forward() {
		let num = this.currentIndex() + 1;
		const list = this.playlist();
		if (list.length == 0) return;
		if (num >= list.length) return;
		const current = list[num];
		if (!current) return;
		this.currentIndex.set(num);
		this.yt.selectInPlaylist(num)
	}

	playlistElem(song: PlaylistElem): HTMLElement {
		const div = document.createElement('div');
		const text = `${song.artist} - ${song.title}`;
                div.className = `playlist-item ${song.active ? 'active' : ''}`;
		div.innerHTML = `<span class="playlist-text handwritten song-text">${text}</span>`
		return div;
	}

	formatSecToTime(time: number): string {
		const totalSeconds = Math.floor(time);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		const paddedSeconds = seconds.toString().padStart(2, '0');
		return `${minutes}:${paddedSeconds}`;
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

