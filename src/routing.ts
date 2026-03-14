import { App, type ComponentConfig } from "./app.js";
import type { HTMLComponent } from "./html-component.js";

interface Route {
	path: string;
	zone: string;
	view: HTMLComponent | HTMLElement | ComponentConfig;
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

		this._app.clearZone(view.zone);
		this._app.getPanelFor(view.zone)?.hideTabs();
		this._app.addTab(view.zone, view.view);
        };

	addRoute(path: string, component: HTMLElement | HTMLComponent | ComponentConfig, zone: string) {
		this._routes.push({
			path: path,
			view: component,
			zone: zone
		});
	}
}
