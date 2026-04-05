import { EventBus, type EventMap } from "./event-bus.js";

export interface Message {
	author?: string;
	text: string;
}

interface Toast {
	id: number;
	wrapper: HTMLElement;
	inner: HTMLElement;
	timer?: number;
}

export class ToastManager {
	container: HTMLElement;
	toasts: Toast[] = [];
	toastCount = 0;
	MAX_VISIBLE = 5;
	busListener?: () => void;

	constructor(container?: HTMLElement) {
		if (!container) container = this.createContainer();
		this.container =  container;
	}

	createContainer(): HTMLElement {
		const container = document.createElement('div');
		container.id = 'toast-container';
		document.body.appendChild(container);
		return container;
	}

	private createToastEntry(message: Message, urgent: boolean) {
		const toast = document.createElement('div');
		toast.className = `toast ${urgent ? 'urgent' : ''}`;
		toast.innerHTML = `
		<div class="toast-content">
		${message.author ? 
			`<span class="toast-user">${message.author} ${urgent ? '(Urgent)' : ''}</span>`
			: ''
		}
		<p class="toast-msg">${message.text}</p>
		</div>
		`;
		return toast;
	}

	private prepareTimer(toast: Toast) {
		const startTimer = () => {
			toast.timer = setTimeout(() => this.remove(toast.id), 6000);
		};
		startTimer();

		toast.wrapper.addEventListener('mouseenter', () => clearTimeout(toast.timer));
		toast.wrapper.addEventListener('mouseleave', startTimer);
	}

	show(message: Message, ephemeral: boolean = true, urgent: boolean = false) {
		const id = this.toastCount++;

		const wrapper = document.createElement('div');
		wrapper.className = 'toast-wrapper';
		wrapper.style.setProperty('--index', '0');

		const toast = this.createToastEntry(message, urgent);

		wrapper.appendChild(toast);
		this.container.appendChild(wrapper);

		const toastObj: Toast = { id, wrapper, inner: toast };

		this.toasts.unshift(toastObj);
		this.updateStack();

		wrapper.addEventListener('click', () => this.remove(id));

		if (ephemeral) this.prepareTimer(toastObj);
	}

	remove(id: number) {
		const index = this.toasts.findIndex(t => t.id === id);
		if (index > -1) {
			const toastObj = this.toasts[index];
			if (!toastObj) return;
			if (toastObj.timer) clearTimeout(toastObj.timer);
			this.toasts.splice(index, 1);
			this.updateStack();
			toastObj.inner.classList.add('hide');
			setTimeout(() => toastObj.wrapper.remove(), 400); 
		}
	}

	updateStack() {
		this.toasts.forEach((t, idx) => {
			t.wrapper.style.setProperty('--index', `${idx}`);

			if (idx >= this.MAX_VISIBLE) {
				t.wrapper.style.opacity = '0';
				t.wrapper.style.pointerEvents = 'none';
			} else {
				t.wrapper.style.opacity = '1';
				t.wrapper.style.pointerEvents = 'auto';
			}
		});
	}

	setToastEvent<T extends EventMap>(event: keyof T, bus:EventBus<T>) {
		this.busListener = bus.on(event, (msg) => this.show(msg));
	}

	destroy() {
		if (this.busListener) this.busListener();
	}
}

