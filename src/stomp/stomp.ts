export class StompFrame<T = any> {
	constructor(
		public readonly command: string,
		public readonly headers: Record<string, string> = {},
		public readonly body: T | null = null
	) {}
}

export class StompError extends Error {
	constructor(
		public readonly frame: StompFrame,
		public readonly message: string
	) {
		super(`STOMP Error: ${message}`);
		this.name = 'StompError';
	}
}

export interface StompHandler {
	handle(frame: StompFrame<any>): void;
}

export interface StompInterceptor {
	intercept(frame: StompFrame<any>, next: StompHandler): void;
}

export interface StompSubscription {
	id: string;
	destination: string;
	unsubscribe: () => void;
}
