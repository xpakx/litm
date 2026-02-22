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
})();
