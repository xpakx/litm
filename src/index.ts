import { App } from "./app.js";

(() => {
    const app = new App("app");

    app.register({
	    title: 'Basic Window',
	    x: 50,
	    y: 50,
	    width: 250, 
	    height: 120,
	    services: [],
	    template: `<p style="text-align:center; margin:0; color:#666">Hello World</p>`
    });

})();
