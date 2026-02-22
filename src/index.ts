import { App, type WindowContext } from "./app.js";


const clockService = (ctx: WindowContext) => {
	setInterval(() => {
		if(ctx.root.parentNode) {
			ctx.body.innerText = new Date()
				.toLocaleTimeString();
		}
	}, 1000);
}


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

    app.register({
        title: 'Music',
        x: 720,
	y: 50,
        width: 420, 
	height: 280,
        template: `
                <iframe 
                    style="width: 100%; height: 100%;"
                    src="https://www.youtube.com/embed/krGs2V3Vk3w" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
        `,
        services: []
    });

    app.register({
	    title: 'Clock',
	    x: 10,
	    y: 200,
	    width: 200,
	    height: 100,
	    template: `<div id="clock-${Date.now()}" style="font-size:20px; text-align:center">...</div>`,
	    services: [clockService]
    });

})();
