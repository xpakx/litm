import { signal } from "./signal.js";

export class Youtube {
	w: any;
	private player: any | null = null;
	private container?: HTMLElement;
	currentTime = signal(0);
	totalTime = signal(0);
	private timeUpdateTimer: any = null;

	constructor() {
		this.w = window as any;
	}

	createPlayer(videoId: string) {

		this.container = document.createElement('script');
		this.container.id = 'yt-container';
		this.container.style.display = 'none';
		document.body.appendChild(this.container);

		this.player = new this.w.YT.Player(this.container, {
			videoId: videoId,
			events: {
				onReady: () => console.log('Player Ready')
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
		this.player?.getCurrentTime().then((t: number) => {
			this.player.seekTo(t + seconds, true);
		});
	}

	select(videoId: string) {
		this.player?.loadVideoById(videoId);
	}

	getVideoDetails(): MusicData {
		const data = this.player.getVideoData();
		return {
			title: data.title,
			artist: data.author
		};
	}
}

export interface MusicData {
	title: string;
	artist: string;
}
