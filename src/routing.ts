import { App } from "./app.js";

interface Route {
	path: string;
	zone?: string;
	view: string;
}

export class RoutingModule {
	private _app?: App;
	private _routes: Route[];

	constructor(routes: Route[]) {
		this._routes = routes;
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
			zone.innerHTML = view.view;
		}
		else {
			this._app.desktop.innerHTML = view.view;
		}
        };




}
