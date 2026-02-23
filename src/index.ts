import { App, type WindowContext } from "./app.js";
import { diceWindow } from "./dice-window.js";
import { EventBus } from "./event-bus.js";


const clockService = (ctx: WindowContext) => {
	setInterval(() => {
		if(ctx.root.parentNode) {
			ctx.body.innerText = new Date()
				.toLocaleTimeString();
		}
	}, 1000);
}

const tagWindowService = (ctx: WindowContext) => {
	const container = ctx.body.querySelector('#char-sheet')!;

	// TODO: context should have arbitrary state
	character.themes.forEach(theme => {
		const themeEl = document.createElement('div');
		themeEl.style.marginBottom = '15px';

		let html = `<h4 style="margin: 0 0 5px 0; color: #cdd6f4;">${theme.name}</h4><div style="display: flex; flex-wrap: wrap; gap: 5px;">`;

		theme.powerTags.forEach(tag => {
			html += `<button class="tag-btn power-tag" data-type="power" data-name="${tag}">${tag}</button>`;
		});

		theme.weaknessTags.forEach(tag => {
			html += `<button class="tag-btn weakness-tag" data-type="weakness" data-name="${tag}">${tag}</button>`;
		});

		html += `</div>`;
		themeEl.innerHTML = html;
		container.appendChild(themeEl);
	});

	const buttons = container.querySelectorAll('.tag-btn');
	buttons.forEach((elem: Element) => {
		const btn = elem as HTMLButtonElement;
		btn.addEventListener('click', (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			target.classList.toggle('selected');

			const selectedTags = Array.from(container.querySelectorAll('.tag-btn.selected')).map((el: any) => ({
				name: el.getAttribute('data-name'),
				type: el.getAttribute('data-type'),
				value: el.getAttribute('data-type') === 'power' ? 1 : -1
			}));

			EventBus.instance.emit('TAGS_UPDATED', selectedTags);
		});
	});
}

function characterWindow(x: number, y: number, character: Character): any {
	return {
		title: `Character: ${character.name}`,
		x: x,
		y: y,
		width: 320, 
		height: 450,
		template: `<div id="char-sheet" style="padding: 10px; overflow-y: auto; height: 100%; box-sizing: border-box;"></div>`,
		services: [tagWindowService]
    }
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

interface Theme {
	name: string;
	powerTags: string[];
	weaknessTags: string[];
}

interface Character {
	name : string;
	themes: Theme[];
}

const character: Character = {
    name: "Name",
    themes: [
        {
            name: "Theme 1",
            powerTags: ["Tag 1", "Tag 2", "Tag 2"],
            weaknessTags: ["Weakness"]
        },
    ]
};





(() => {
    const app = new App("app");

    app.register(basicWindow(50, 50, "Hello world"));
    app.register(musicWindow(720, 50, "krGs2V3Vk3w"));
    app.register(clockWindow(10, 200));
    app.register(characterWindow(50, 50, character));
    app.register(diceWindow(100, 150));
})();
