import { type WindowContext, type Service } from "../app.js";
import { EventBus } from "../event-bus.js";
import { componentOf, HTMLComponent, signal, trigger } from "../html-component.js";
import diceTemplate from './dice.html'; 

class DiceService implements Service {
	currentPower = signal(0);
	totalScore = signal(0);
	outcomeText = signal('');
	outcomeClass = signal('');
	powerColor = signal('');
	die1Class = signal('fa-dice-six');
	die2Class = signal('fa-dice-six');


	rollAnimation = trigger(); 
        diceClasses = ['fa-dice-one', 'fa-dice-two', 'fa-dice-three', 'fa-dice-four', 'fa-dice-five', 'fa-dice-six'];

	activeTags = signal<any[]>([]);

	addHocPower: number = 0;
	tagPower: number = 0;

	private tagComponent(tag: any): HTMLElement {
		const div = document.createElement('div');
		const color = tag.type === 'power' ? '#a6e3a1' : '#f38ba8';
		div.style.fontSize = '0.9em';
		div.style.marginBottom = '3px';
		div.style.color = color;
		const sign = tag.value > 0 ? '+' : '';
		div.textContent = `${sign}${tag.value} ${tag.name}`;
		return div;
	}

	private diceToClass(result: number): string {
		return this.diceClasses[result - 1]!;
	}

	private onTags(tags: any[]) {
		this.activeTags.set(tags);
		this.tagPower = tags.reduce((sum, tag) => sum + tag.value, 0);
		this.currentPower.set(this.tagPower + this.addHocPower);
		this.powerColor.set(this.currentPower() < 0 ? '#f38ba8' : '#a6e3a1');
	}

	private updateOutcome(d1: number, d2: number, total: number) {
		if (total <= 6) {
			this.outcomeClass.set('marker-peach');
			this.outcomeText.set("Miss...");
		} else if (total <= 9) { 
			this.outcomeClass.set('marker-blue');
			this.outcomeText.set("Mixed Success");
		}
		else {
			this.outcomeClass.set('marker-yellow');
			this.outcomeText.set("Success!");
		}

		this.die1Class.set(this.diceToClass(d1));
		this.die2Class.set(this.diceToClass(d2));
		this.totalScore.set(total);
	}

	private onClick() {
		const d1 = Math.floor(Math.random() * 6) + 1;
		const d2 = Math.floor(Math.random() * 6) + 1;
		const total = d1 + d2 + this.currentPower();

		this.rollAnimation();
		setTimeout(() => this.updateOutcome(d1, d2, total), 250);
	}

	updateAdHocPower(delta: number) {
		this.addHocPower += delta;
		this.currentPower.set(this.tagPower + this.addHocPower);
		this.powerColor.set(this.currentPower() < 0 ? '#f38ba8' : '#a6e3a1');
	}

	init(ctx: WindowContext): void {
		const component = ctx.body as HTMLComponent;
		component.bindContent('total-power', this.currentPower);
		component.bindContent('total-score', this.totalScore);
		component.bindContent('outcome-text', this.outcomeText);
		component.bindDynamicClass('outcome-text', this.outcomeClass);
		component.bindDynamicClass('die1', this.die1Class);
		component.bindDynamicClass('die2', this.die2Class);
		component.bindStyle('total-power', 'color', this.powerColor);
		component.bindList('active-tags', this.activeTags, (tag) => this.tagComponent(tag));

		component.bindAnimation('dice-result-container-element', 'rolling', this.rollAnimation);

		EventBus.instance.on('TAGS_UPDATED', (tags: any[]) => this.onTags(tags));
		component.onClick('roll-btn', () => this.onClick());
		component.onClick('sub-power-btn', () => this.updateAdHocPower(-1));
		component.onClick('add-power-btn', () => this.updateAdHocPower(1));
	}
}

export function diceWindow(x: number, y: number): any {
	return {
		title: 'Action / Dice Roller',
		x: x,
		y: y,
		width: 300, height: 450,
		// template: diceTemplate,
		services: [new DiceService()],
		element: componentOf('win-dice', diceTemplate),
	}
}
