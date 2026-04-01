import { HttpClient } from "./core/http/client.js";
import { signal, trigger } from "./core/signal.js";

export class Youtube {
	w: any;
	private player: any | null = null;
	private container?: HTMLElement;
	currentTime = signal(0);
	totalTime = signal(0);
	isPlaying = signal(false);
	playlistPos = signal(0);

	title = signal<string | undefined>(undefined);
	artist = signal<string | undefined>(undefined);
	private timeUpdateTimer: any = null;
	private http: HttpClient;

	private onReadyTrigger = trigger();
	private ready: boolean = false;

	constructor(http: HttpClient) {
		this.w = window as any;
		this.http = http;
	}

	createPlayer(videoId: string) {

		this.container = document.createElement('script');
		this.container.id = 'yt-container';
		this.container.style.display = 'none';
		document.body.appendChild(this.container);

		this.player = new this.w.YT.Player(this.container, {
			videoId: videoId,
			events: {
				onReady: () => this.onReady(), 
				onStateChange: (event: any) => this.updateState(event),
			}
		});

		this.timeUpdateTimer = setInterval(() => {
			if (this.player && typeof this.player.getCurrentTime === 'function') {
				const currentTime = this.player.getCurrentTime();

				const state = this.player.getPlayerState();
				if (state === 1) {
					this.currentTime.set(currentTime ?? 0);
				}
			}
		}, 100);
	}

	private updateState(event: any) {
		if (event.data === 1) {
			this.isPlaying.set(true);
			this.totalTime.set(this.player.getDuration());
			const index = this.player.getPlaylistIndex();
			this.playlistPos.set(index !== -1 ? index : 0);
			const data = this.player.getVideoData();
			if (data) this.setTitle(data.title, data.author);
		} else {
			this.isPlaying.set(false);
		}
	}

	private setTitle(title?: string, artist?: string) {
		if (title) {
			if (title.includes('-')) {
				const data = this.complexTitle(title);
				if (data) {
					this.title.set(data.title);
					this.artist.set(data.artist);
					return;
				}
			}
			this.title.set(title);
		}
		if (artist) this.artist.set(artist);
	}

	private complexTitle(title: string): MusicData | void {
		const separator = " - ";

		const index = title.indexOf(separator);

		if (index !== -1) {
			const artist = title.slice(0, index).trim();
			const song = title.slice(index + separator.length).trim();

			return {
				artist: artist,
				title: song,
			}
		}
	}




	ensureYoutubeAPI(): Promise<void> {
		if (this.w.YT && this.w.YT.Player) return Promise.resolve();

		return new Promise(resolve => {
			const tag = document.createElement('script');
			tag.src = "https://www.youtube.com/iframe_api";

			document.head.appendChild(tag);
			this.w.onYouTubeIframeAPIReady = resolve;
		});
	}

	play() {
		this.player?.playVideo(); 
                this.totalTime.set(this.player.getDuration());
	}

	pause() {
		this.player?.pauseVideo(); 
	}

	skip(seconds: number) {
		const t = this.player.getCurrentTime();
		this.player.seekTo(t + seconds, true);
	}

	select(id: string | string[]) {
		if (typeof id === 'string') this.selectOne(id);
		else this.selectList(id);
	}

	selectInPlaylist(index: number) {
		this.player?.playVideoAt(index);
	}

	selectOne(videoId: string) {
		this.player?.loadVideoById(videoId);
	}

	selectList(videoIds: string[]) {
		this.player?.loadPlaylist(videoIds);
	}

	getVideoDetails(): MusicData {
		const data = this.player.getVideoData();

		console.log(data);
		return {
			title: data.title,
			artist: data.author
		};
	}

	getPlaylistData(ids: string[]): Promise<MusicData[]> {
		const apiAddress = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch"

		const promises = ids.map((id: string) =>
			this.http.get<VideoMetdata>(
				`${apiAddress}?v=${id}&format=json`
			).then(res => {
				const data = this.complexTitle(res.title);
				if (data) return data;
				return {
					artist: res.author_name,
					title: res.title
				}
			})
		);
		return Promise.all(promises);
	}

	onReady() {
		console.log('Player Ready');
		this.ready = true;
		this.onReadyTrigger();
	}

	whenReady(func: () => void) {
		if (this.ready) {
			func();
			return;
		}
		this.onReadyTrigger.subscribe(() => func());
	}
}

export interface MusicData {
	title: string;
	artist: string;
}

interface VideoMetdata {
	title: string;
	author_name: string;
}
