import { StompError, StompFrame, type StompHandler, type StompInterceptor, type StompSubscription } from "./stomp.js";

export class StompClient {
	private ws: WebSocket | null = null;
	private handler: StompHandler;

	private connected = false;
	private intentionallyDisconnected = false;

	private reconnectAttempts = 0;
	private maxReconnectDelay = 10000;
	private reconnectTimeoutId: any = null;

	private subCounter = 0;
	private subscriptions = new Map<string, { destination: string; callback: (body: any, headers: Record<string, string>) => void }>();
	private offlineQueue: StompFrame<any>[] = [];

	constructor(
		private readonly url: string,
		private readonly connectHeaders: Record<string, string> = {},
		interceptors: StompInterceptor[] = []
	) {
		const backend: StompHandler = {
			handle: (frame: StompFrame<any>) => this.handleWs(frame)
		};

		this.handler = interceptors.reduceRight<StompHandler>(
			(nextHandler, interceptor) => ({
				handle: (frame) => interceptor.intercept(frame, nextHandler),
			}),
			backend
		);
	}

	private handleWs(frame: StompFrame<any>) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) {
			if (frame.command !== 'CONNECT' && frame.command !== 'STOMP') {
				this.offlineQueue.push(frame);
			} else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.ws.send(this.serializeFrame(frame));
			}
			return;
		}
		this.ws.send(this.serializeFrame(frame));
	}

	public connect(): Promise<void> {
		this.intentionallyDisconnected = false;

		return new Promise((resolve, reject) => {
			if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
				resolve();
				return;
			}

			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				const frame = new StompFrame('CONNECT', {
					'accept-version': '1.1,1.2',
					'heart-beat': '0,0',
					...this.connectHeaders
				});
				this.handler.handle(frame);
			};

			this.ws.onmessage = (event) => {
				const frame = this.parseFrame(event.data);
				if (!frame) return;

				switch (frame.command) {
					case 'CONNECTED':
						this.connected = true;
						this.reconnectAttempts = 0;
						this.restoreState();
						resolve();
						break;
					case 'MESSAGE':
						this.handleMessage(frame);
						break;
					case 'ERROR':
						const errorMsg = frame.headers['message'] || 'Unknown Error';
						console.error(new StompError(frame, errorMsg));
						if (!this.connected) reject(new Error(errorMsg));
						break;
				}
			};

			this.ws.onclose = () => this.handleDisconnect();
			this.ws.onerror = () => {
				if (!this.connected) reject(new Error('WebSocket connection failed'));
			};
		});
	}

	public disconnect(): void {
		this.intentionallyDisconnected = true;
		this.connected = false;
		if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.handler.handle(new StompFrame('DISCONNECT'));
			this.ws.close();
		}
		this.ws = null;
	}

	public subscribe<T = any>(
		destination: string, 
		callback: (body: T, headers: Record<string, string>) => void, 
		headers: Record<string, string> = {}
	): StompSubscription {
		const id = `sub-${this.subCounter++}`;
		
		this.subscriptions.set(id, { destination, callback });
		
		this.handler.handle(new StompFrame('SUBSCRIBE', { id, destination, ...headers }));

		return {
			id,
			destination,
			unsubscribe: () => {
				this.subscriptions.delete(id);
				this.handler.handle(new StompFrame('UNSUBSCRIBE', { id }));
			}
		};
	}

	public send<T = any>(destination: string, body: T | null = null, headers: Record<string, string> = {}): void {
		this.handler.handle(new StompFrame('SEND', { destination, ...headers }, body));
	}

	private handleDisconnect() {
		this.connected = false;
		this.ws = null;

		if (!this.intentionallyDisconnected) {
			this.scheduleReconnect();
		}
	}

	private scheduleReconnect() {
		if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);

		const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, this.maxReconnectDelay);
		this.reconnectAttempts++;

		console.warn(`STOMP connection lost. Reconnecting in ${delay}ms...`);

		this.reconnectTimeoutId = setTimeout(() => {
			this.connect().catch(() => {});
		}, delay);
	}

	private restoreState() {
		for (const [id, sub] of this.subscriptions.entries()) {
			this.handler.handle(new StompFrame('SUBSCRIBE', { id, destination: sub.destination }));
		}

		while (this.offlineQueue.length > 0) {
			const frame = this.offlineQueue.shift();
			if (frame) this.handler.handle(frame);
		}
	}

	private handleMessage(frame: StompFrame) {
		const subId = frame.headers['subscription'];
		if (subId && this.subscriptions.has(subId)) {
			const sub = this.subscriptions.get(subId)!;
			sub.callback(frame.body, frame.headers);
		}
	}

	private serializeFrame(frame: StompFrame): string {
		let out = `${frame.command}\n`;
		
		let bodyStr = '';
		if (frame.body !== null && frame.body !== undefined) {
			if (typeof frame.body === 'object') {
				bodyStr = JSON.stringify(frame.body);
				if (!frame.headers['content-type']) {
					frame.headers['content-type'] = 'application/json';
				}
			} else {
				bodyStr = String(frame.body);
			}
			frame.headers['content-length'] = String(new Blob([bodyStr]).size);
		}

		for (const [key, value] of Object.entries(frame.headers)) {
			out += `${key}:${value}\n`;
		}

		out += `\n${bodyStr}\0`;
		return out;
	}

	private parseFrame(data: string): StompFrame | null {
		const raw = data.replace(/\0$/, '').trim();
		if (!raw) return null;

		const lines = raw.split('\n');
		const command = lines.shift() || '';
		
		const headers: Record<string, string> = {};
		let i = 0;
		
		while (i < lines.length && lines[i]!.trim() !== '') {
			const splitIdx = lines[i]!.indexOf(':');
			if (splitIdx !== -1) {
				const key = lines[i]!.slice(0, splitIdx).trim();
				const value = lines[i]!.slice(splitIdx + 1).trim();
				headers[key] = value;
			}
			i++;
		}

		const bodyStr = lines.slice(i + 1).join('\n');
		let body: any = bodyStr;

		if (headers['content-type']?.includes('application/json') && bodyStr) {
			try {
				body = JSON.parse(bodyStr);
			} catch (e) {}
		}

		return new StompFrame(command, headers, body);
	}
}
