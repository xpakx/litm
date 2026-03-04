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
