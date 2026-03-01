import { type WindowContext, type Service } from "../app.js";
import { EventBus } from "../event-bus.js";
import { componentOf, HTMLComponent, signal } from "../html-component.js";
import diceTemplate from './dice.html'; 

class DiceService implements Service {
	currentPower = signal(0);
	totalScore = signal(0);
	outcomeText = signal('');
	outcomeClass = signal('');
	powerColor = signal('');
	die1Class = signal('fa-dice-six');
	die2Class = signal('fa-dice-six');
        diceClasses = ['fa-dice-one', 'fa-dice-two', 'fa-dice-three', 'fa-dice-four', 'fa-dice-five', 'fa-dice-six'];

	activeTagsDiv?: HTMLElement;

	addHocPower: number = 0;
	tagPower: number = 0;

	component?: HTMLComponent;

	private tagComponent(tag: any): string {
		const color = tag.type === 'power' ? '#a6e3a1' : '#f38ba8';
		const style = `font-size: 0.9em; margin-bottom: 3px; color: ${color}`;
		const value = `${tag.value > 0 ? '+' : ''}${tag.value} ${tag.name}`
		return `<div style="${style}">${value}</div>`
	}

	private diceToClass(result: number): string {
		return this.diceClasses[result - 1]!;
	}

	private onTags(tags: any[]) {
		// if (!this.activeTagsDiv) return
		// this.activeTagsDiv.innerHTML = tags.map(t => this.tagComponent(t)).join('');
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

		this.component?.pokeAnimation('dice-result-container-element', 'rolling');
		setTimeout(() => this.updateOutcome(d1, d2, total), 250);
	}

	updateAdHocPower(delta: number) {
		this.addHocPower += delta;
		this.currentPower.set(this.tagPower + this.addHocPower);
		this.powerColor.set(this.currentPower() < 0 ? '#f38ba8' : '#a6e3a1');
	}

	init(ctx: WindowContext): void {
		this.component = ctx.body as HTMLComponent;
		this.activeTagsDiv = ctx.body.querySelector('#active-tags') as HTMLElement;
		this.component.bindContent('total-power', this.currentPower);
		this.component.bindContent('total-score', this.totalScore);
		this.component.bindContent('outcome-text', this.outcomeText);
		this.component.bindDynamicClass('outcome-text', this.outcomeClass);
		this.component.bindDynamicClass('die1', this.die1Class);
		this.component.bindDynamicClass('die2', this.die2Class);
		this.component.bindStyle('total-power', 'color', this.powerColor);

		EventBus.instance.on('TAGS_UPDATED', (tags: any[]) => this.onTags(tags));
		this.component.onClick('roll-btn', () => this.onClick());
		this.component.onClick('sub-power-btn', () => this.updateAdHocPower(-1));
		this.component.onClick('add-power-btn', () => this.updateAdHocPower(1));
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
