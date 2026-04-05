import { App, type ComponentContext, type ComponentDefinition, type Service, type WindowConfig } from "./core/app.js";
import { characterWindow, type Character } from "./character-component/character-window.js";
import { diceWindow } from "./dice-component/dice-window.js";
import { HttpErrorResponse, HttpRequest, HttpResponse, type HttpHandler, type HttpInterceptor } from "./core/http/http.js";
import { HttpClient } from "./core/http/client.js";
import { smartNoteWindow } from "./smart-component/smart-note-window.js";
import { testWindow } from './test-component/test-component.js';
import { StompClient } from "./core/stomp/client.js";
import { sidebarComponent } from "./sidebar-component/sidebar.js";
import { RoutingModule } from "./core/routing.js";
import { Youtube } from "./youtube.js";
import { musicComponent } from './music/music.js';
import { bindingTestWindow } from "./test.js";
import { smartListSignal, objectSignal } from "./core/signal.js";
import { ToastManager } from "./core/toast.js";


class ClockService implements Service {
    init(ctx: ComponentContext): void {
	setInterval(() => {
		ctx.body.innerText = new Date()
			.toLocaleTimeString();
	}, 1000);
    }
}

function clockWindow(x: number, y: number): WindowConfig {
	return {
		title: 'Clock',
		x: x,
		y: y,
		width: 200,
		height: 100,
		template: `<div id="clock-${Date.now()}" style="font-size:20px; text-align:center">...</div>`,
		services: [new ClockService()]
	}
}

const character: Character = {
    name: "Name",
    themes: [
        {
            name: "Theme 1",
            powerTags: ["Tag 1", "Tag 2", "Tag 3"],
            weaknessTags: ["Weakness"],
	    quest: "Quest 1",
        },
    ]
};


export interface MyEvents {
	"tag:add": TagEvent;
	"tag:remove": TagEvent;
}

export interface TagEvent {
	name: string,
	type: 'weakness' | 'power',
	value: number,
}


(() => {
    const app = new App("app");
    const http = new HttpClient();

    testZones(app);
    app.enableZonePanning('main');
    // testPanels(app);
    // app.register(clockWindow(10, 200));
    // app.register('music', {...musicWindow("krGs2V3Vk3w"), zone: 'main', trapInZone: true});
    app.register('theme', {...characterWindow(character), zone: 'main', trapInZone: true});
    app.register('dice', diceWindow());
    app.register('smart', smartNoteWindow());
    app.register('test', testWindow());
    app.register('binding', bindingTestWindow());

    app.createTab('sidebar', 'dice');
    app.createTab('sidebar', 'smart');

    // app.openWindow('dice', 100, 150);
    app.openWindow('dice', 200, 150);
    app.openWindow('theme', 300, 200);
    // app.openWindow('smart', 400, 250);
    // app.openWindow('test', 500, 300);
    app.openWindow('binding', 500, 300);

    // app.openWindow('music', 720, 50);
    // app.openWindow('music', 720, 50);

    function newTestWindow(x: number, y: number) {
	    app.openWindow('test', x, y);
    }
    (window as any).newTestWindow = newTestWindow;

    // testHttpRequest(http);
    // testHttpInterceptor();
    // testWS();
    // testRouting(app);
    //
    const music = new Youtube(http);
    music.ensureYoutubeAPI().then(() => {
	    music.createPlayer('krGs2V3Vk3w');
	    app.register('music2', musicComponent(music));
	    app.openWindow('music2', 100, 100);
    });

    (window as any).play = () => music.play();
    (window as any).select = (id: string) => music.select(id);
    // testSmartSignal();
    testToasts(app);
})();


function testHttpRequest(http: HttpClient) {
	interface Todo {
		userId: number;
		id: number;
		title: string;
		completed: boolean;
	}


	http.get<Todo>('https://jsonplaceholder.typicode.com/todos/1')
		.then((todo: Todo) => console.log(todo))
		.catch((error: HttpErrorResponse) => console.log('Something went wrong:', error));

}


function testHttpInterceptor() {
	interface Todo {
		userId: number;
		id: number;
		title: string;
		completed: boolean;
	}

	class LoggingInterceptor implements HttpInterceptor {
		async intercept(req: HttpRequest<any>, next: HttpHandler): Promise<HttpResponse<any>> {
			const start = Date.now();
			return next.handle(req)
				.then((response: HttpResponse<any>) => {
					const ms = Date.now() - start;
					console.log(`[Log] SUCCESS: ${req.method} ${req.url} - ${response.status} in ${ms}ms`);
					return response;
				})
				.catch((error: any) => {
					const ms = Date.now() - start;
					if (error instanceof HttpErrorResponse) {
						console.error(`[Log] ERROR: ${req.method} ${req.url} - ${error.status} in ${ms}ms`, error.error);
					}
					throw error;
				});
		}
	}

	const http = new HttpClient([new LoggingInterceptor()]);

	http.get<Todo>('https://jsonplaceholder.typicode.com/todos/2')
		.then((todo: Todo) => console.log(todo))
		.catch((error: HttpErrorResponse) => console.log('Something went wrong:', error));
}


function testWS() {
	const stompClient = new StompClient('ws://localhost:8000/ws-endpoint', {
		login: 'user',
	passcode: 'password'
	});

	stompClient.connect()
		.then(() => {
			console.log("Connected!");
			stompClient.subscribe('/topic/updates', (body, _) => {
				console.log("Received data:", body);
			});
			stompClient.send('/app/chat', { message: 'Hello World' });
		});
}

function testZones(app: App) {
        app.setLayout({
            cols: '1fr 200px', 
            areas: [
                ['main', 'sidebar'],
            ]
	});

}

function testPanels(app: App) {
        app.createPanel(
		'sidebar', sidebarComponent(), true
	);
}

function testRouting(app: App) {
	const router = new RoutingModule();
	router.addHiddenRoute('/', diceWindow(), 'sidebar');
	router.register(app);
}


function testSmartSignal() {
	const users = smartListSignal([{ id: 1, name: 'Alice' }]);

	users.subscribe((_, patches) => {
		patches.forEach(patch => {
			switch (patch.type) {
				case 'insert':
					console.log(`Inserted items at index ${patch.index}`, patch.items);
				break;
				case 'remove':
					console.log(`Removed ${patch.count} item(s) at index ${patch.index}`);
				break;
				case 'update':
					console.log(`Updated item at ${patch.index}`, patch.item);
				break;
				case 'set':
					console.log(`Full array replacement! Render from scratch.`);
				break;
			}
		});
	});

	users.push({ id: 2, name: 'Bob' }); 
	users.updateAt(0, u => ({ ...u, name: 'Alice Smith' })); 
	users.removeBy('id', 1);




	const user = objectSignal({ 
		id: 1, 
		name: 'Alice', 
		age: 25 
	});

	user.subscribe((u) => console.log("Whole user changed:", u));

	user.subscribeField('name', (newName) => {
		console.log("Name changed to:", newName);
	});

	user.subscribeField('age', (newAge) => {
		console.log("Age changed to:", newAge);
	});

	user.setField('name', 'Alice Smith'); 

	user.set({ id: 1, name: 'Alice Smith', age: 26 }); 

	const ageSignal = user.getFieldSignal('age');
	ageSignal.update(a => a + 1);
}


function testToasts(app: App) {
	const container = document.getElementById('toast-container')!;
	const toastManager = new ToastManager(container);
	for (let i = 1; i <= 10; i++) toastManager.show({text: `test ${i}`});
}
