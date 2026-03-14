import { App } from "./app.js";
import type { HTMLComponent } from "./html-component.js";

interface Route {
	path: string;
	zone?: string;
	view: string | HTMLComponent | HTMLElement;
}

export class RoutingModule {
	private _app?: App;
	private _routes: Route[];

	constructor(routes?: Route[]) {
		this._routes = routes ?? [];
	}

	register(app: App) {
		this._app = app;

		const navigate = (url: string) => { 
			window.history.pushState(null, '', url);
			this.route();
		};

		window.addEventListener("click", (e: MouseEvent) => {
			if (!e.target) return;
			const elem = e.target as HTMLLinkElement;
			if (elem.matches("[data-link]")) {
				e.preventDefault();
				navigate(elem.href);
			}
		});

		window.addEventListener("popstate", () => this.route());

		this.route();
	}

        route() {
		console.log("Routing");
		if (!this._app) return;

		const path = window.location.pathname;
		const view = this._routes.find((r) => r.path == path)
		console.log(path, view);
		if (!view) return;


		if (view.zone) {
			const zone = this._app.getZone(view.zone);
			if (!zone) return;
			this.routeElement(zone, view);
		}
		else {
			this.routeElement(this._app.desktop, view);
		}
        };

	routeElement(element: HTMLElement, view: Route) {
			element.innerHTML = '';
			if (view.view instanceof HTMLElement) {
				element.appendChild(view.view);
			} else {
				element.innerHTML = view.view;
			}
	}

	addRoute(path: string, component: HTMLElement | HTMLComponent | string, zone?: string) {
		if (zone) {
			this._routes.push({
				path: path,
				view: component,
				zone: zone
			});
		} else {
			this._routes.push({
				path: path,
				view: component,
			});
		}
	}
}
