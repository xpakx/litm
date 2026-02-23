import { App, type WindowContext } from "./app.js";


const clockService = (ctx: WindowContext) => {
	setInterval(() => {
		if(ctx.root.parentNode) {
			ctx.body.innerText = new Date()
				.toLocaleTimeString();
		}
	}, 1000);
}


function musicWindow(x: number, y: number, id: string): any {
	return {
		title: 'Music',
		x: x,
		y: y,
		width: 420, 
		height: 280,
		template: `
		<iframe 
		style="width: 100%; height: 100%;"
		src="https://www.youtube.com/embed/${id}" 
			frameborder="0" 
		allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
		allowfullscreen>
		</iframe>
		`,
		services: []
	}
}

function clockWindow(x: number, y: number) {
	return {
		title: 'Clock',
		x: x,
		y: y,
		width: 200,
		height: 100,
		template: `<div id="clock-${Date.now()}" style="font-size:20px; text-align:center">...</div>`,
		services: [clockService]
	}
}

function basicWindow(x: number, y: number, text: string): any {
	return {
		title: 'Basic Window',
		x: x,
		y: y,
		width: 250, 
		height: 120,
		services: [],
		template: `
		<p style="text-align:center; margin:0; color:#666">
		${text}
		</p>`
	}
}


(() => {
    const app = new App("app");

    app.register(basicWindow(50, 50, "Hello world"));

    app.register(musicWindow(720, 50, "krGs2V3Vk3w"));
    app.register(clockWindow(10, 200));

})();
