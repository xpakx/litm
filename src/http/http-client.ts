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

class HttpFetchBackend implements HttpHandler {
	async handle(req: HttpRequest<any>): Promise<HttpResponse<any>> {
		const init: RequestInit = {
			method: req.method,
			headers: { ...req.headers },
		};

		if (req.body !== null && req.method !== 'GET' && req.method !== 'HEAD') {
			if (typeof req.body === 'object') {
				init.body = JSON.stringify(req.body);
				if (!(init.headers as Record<string, string>)['Content-Type']) {
					(init.headers as Record<string, string>)['Content-Type'] = 'application/json';
				}
			} else {
				init.body = String(req.body);
			}
		}

		const response = await fetch(req.url, init);

		let parsedBody: any;
		const contentType = response.headers.get('content-type') || '';

		if (contentType.includes('application/json')) {
			parsedBody = await response.json().catch(() => null);
		} else {
			parsedBody = await response.text();
		}

		if (!response.ok) {
			throw new HttpErrorResponse(parsedBody, response.status, response.statusText, req.url);
		}

		return new HttpResponse(parsedBody, response.status, response.statusText, response.headers);
	}
}

export class HttpClient {
	private handler: HttpHandler;

	constructor(interceptors: HttpInterceptor[] = []) {
		const backend = new HttpFetchBackend();

		this.handler = interceptors.reduceRight<HttpHandler>(
			(nextHandler, interceptor) => ({
				handle: (req) => interceptor.intercept(req, nextHandler),
			}),
			backend
		);
	}

	private async request<T>(req: HttpRequest<any>): Promise<T> {
		const res = await this.handler.handle(req);
		return res.body as T;
	}

	async requestFull<T>(req: HttpRequest<any>): Promise<HttpResponse<T>> {
		return await this.handler.handle(req);
	}

	get<T>(url: string, headers?: Record<string, string>): Promise<T> {
		return this.request<T>(new HttpRequest('GET', url, null, headers));
	}

	post<T>(url: string, body: any, headers?: Record<string, string>): Promise<T> {
		return this.request<T>(new HttpRequest('POST', url, body, headers));
	}

	put<T>(url: string, body: any, headers?: Record<string, string>): Promise<T> {
		return this.request<T>(new HttpRequest('PUT', url, body, headers));
	}

	patch<T>(url: string, body: any, headers?: Record<string, string>): Promise<T> {
		return this.request<T>(new HttpRequest('PATCH', url, body, headers));
	}

	delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
		return this.request<T>(new HttpRequest('DELETE', url, null, headers));
	}
}
