
export class EventBus {
	static #instance: EventBus;
	listeners = {} as Record<string, Function[]>;

	private constructor() {}

	static get instance(): EventBus {
		if (!EventBus.#instance) {
			EventBus.#instance = new EventBus();
		}
		return EventBus.#instance;
	}


	on(event: string, callback: Function) {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event].push(callback);
		return () => this.off(event, callback);
	}

	off(event: string, callback: Function): void {
		if (!this.listeners[event]) return;

		this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
		if (this.listeners[event].length === 0) {
			delete this.listeners[event];
		}
	}

	emit(event: string, payload?: any) {
		if (this.listeners[event]) {
			this.listeners[event]
			.forEach(cb => cb(payload));
		}
	}

	once(event: string, callback: Function): void {
		const wrapper = (payload?: any) => {
			callback(payload);
			this.off(event, wrapper);
		};
		this.on(event, wrapper);
	}

	clearAll(): void {
		this.listeners = {};
	}
};
