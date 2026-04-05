export type EventMap = Record<string, any>;

export class EventBus<Events extends EventMap> {
	private listeners: { [K in keyof Events]?: Array<(payload: Events[K]) => void> } = {};

	on<K extends keyof Events>(event: K, callback: (payload: Events[K]) => void) {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event]!.push(callback);
		return () => this.off(event, callback);
	}

	off<K extends keyof Events>(event: K, callback: (payload: Events[K]) => void): void {
		const eventListeners = this.listeners[event];
		if (!eventListeners) return;

		this.listeners[event] = eventListeners.filter((cb) => cb !== callback);

		if (this.listeners[event]?.length === 0) {
			delete this.listeners[event];
		}
	}

	emit<K extends keyof Events>(event: K, payload: Events[K]): void {
		this.listeners[event]?.forEach((cb) => cb(payload));
	}

	once<K extends keyof Events>(event: K, callback: (payload: Events[K]) => void): void {
		const wrapper = (payload: Events[K]) => {
			callback(payload);
			this.off(event, wrapper);
		};
		this.on(event, wrapper);
	}

	clearAll(): void {
		this.listeners = {};
	}
}
