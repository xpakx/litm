import { App, type ComponentConfig } from "./app.js";
import type { HTMLComponent } from "./html-component.js";

interface Route {
	path: string;
	view: (app: App) => void;
}

interface HiddenRoute {
	path: string;
	zone: string;
	view: HTMLComponent | HTMLElement | ComponentConfig;
}

export class RoutingModule {
	private _app?: App;
	private _routes: Route[];
	private _hiddenroutes: HiddenRoute[] = [];

	constructor(routes?: Route[]) {
		this._routes = routes ?? [];
	}

	register(app: App) {
		this._app = app;

		const navigate = (url: string) => { 
			const routeChanged = this.route(url);
			if (routeChanged) window.history.pushState(null, '', url);
			this.subroute(url);
		};

		window.addEventListener("click", (e: MouseEvent) => {
			if (!e.target) return;
			const elem = e.target as HTMLLinkElement;
			if (elem.matches("[data-link]")) {
				e.preventDefault();
				navigate(elem.href);
			}
		});

		window.addEventListener("popstate", () => this.route(window.location.pathname));

		this.route(window.location.pathname);
		this.subroute(window.location.pathname);
	}

        route(path: string): boolean {
		console.log("Routing");
		if (!this._app) return false;

		const view = this._routes.find((r) => r.path == path)
		console.log(path, view);
		if (!view) return false;

		view.view(this._app);
		return true
        };

	subroute(path: string) {
		if (!this._app) return false;
		const zoneMap = new Map();
		this._hiddenroutes.forEach((r) => {
			if (!zoneMap.has(r.zone) && r.path == path) {
				zoneMap.set(r.zone, r);
			}
		});
		zoneMap.values().forEach((view) => {
			this._app!.clearZone(view.zone);
			this._app!.getPanelFor(view.zone)?.hideTabs();
			this._app!.addTab(view.zone, view.view);
		});
	}

	addRoute(path: string, view: (app: App) => void) {
		this._routes.push({
			path: path,
			view: view,
		});
	}

	addHiddenRoute(path: string, component: HTMLElement | HTMLComponent | ComponentConfig, zone: string) {
		this._hiddenroutes.push({
			path: path,
			view: component,
			zone: zone,
		});
	}
}
