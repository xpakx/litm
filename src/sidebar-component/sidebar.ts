import { type ComponentConfig, type ComponentContext, type Service } from "../core/app.js";
export class HttpRequest<T = any> {
	constructor(
		public readonly method: string,
		public readonly url: string,
		public readonly body: T | null = null,
			public readonly headers: Record<string, string> = {}
	) {}
}

export class HttpResponse<T = any> {
	constructor(
		public readonly body: T,
		public readonly status: number,
		public readonly statusText: string,
		public readonly headers: Headers
	) {}
}

export class HttpErrorResponse extends Error {
	constructor(
		public readonly error: any,
		public readonly status: number,
		public readonly statusText: string,
		public readonly url: string
	) {
		super(`Http failure response for ${url}: ${status} ${statusText}`);
		this.name = 'HttpErrorResponse';
	}
}

export interface HttpHandler {
	handle(req: HttpRequest<any>): Promise<HttpResponse<any>>;
}

export interface HttpInterceptor {
	intercept(req: HttpRequest<any>, next: HttpHandler): Promise<HttpResponse<any>>;
}
import { componentOf, HTMLComponent, } from "../core/html-component.js";
import sidebarTemplate from './sidebar.html';

export class SidebarService implements Service {
	newWindow?: (a: string, x?: number, y?: number) => void;

	constructor() {
	}


	init(ctx: ComponentContext): void {
		this.newWindow = (c, x, y) => ctx.app.openWindow(c, x ?? 0, y ?? 0);
		const component = ctx.body as HTMLComponent;
		component.onClick('entry-1', () => this.openDice());
	}

	openDice() {
		this.newWindow!('dice');
	}

}

export function sidebarComponent(): ComponentConfig {
	return {
		services: [new SidebarService()],
		element: componentOf("sidebar-component", sidebarTemplate),
    }
}
