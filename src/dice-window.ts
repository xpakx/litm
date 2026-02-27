import { type WindowContext, type Service } from "./app.js";
import { EventBus } from "./event-bus.js";
import diceTemplate from './dice.html'; 

class DiceService implements Service {
	currentPower: number = 0;
        diceClasses = ['fa-dice-one', 'fa-dice-two', 'fa-dice-three', 'fa-dice-four', 'fa-dice-five', 'fa-dice-six'];

	activeTagsDiv?: HTMLElement;
	totalPowerSpan?: HTMLElement;
	rollBtn?: HTMLElement;
	totalScore?: HTMLElement;
	outcome?: HTMLElement;
	die1?: HTMLElement;
	die2?: HTMLElement;
	diceContainer?: HTMLElement;

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
		if (!this.activeTagsDiv) return
		this.activeTagsDiv.innerHTML = tags.map(t => this.tagComponent(t)).join('');
		this.currentPower = tags.reduce((sum, tag) => sum + tag.value, 0);

		if (!this.totalPowerSpan) return
		this.totalPowerSpan.innerText = this.currentPower.toString();
		this.totalPowerSpan.style.color = this.currentPower < 0 ? '#f38ba8' : '#a6e3a1';
	}

	private updateOutcome(d1: number, d2: number, total: number) {
		if (!this.outcome) return;
		this.outcome.classList.remove('marker-peach', 'marker-yellow', 'marker-blue');
		if (total <= 6) {
			this.outcome.innerHTML = "Miss...";
			this.outcome.classList.add("marker-peach")
		} else if (total <= 9) { 
			this.outcome.innerHTML = "Mixed Success";
			this.outcome.classList.add("marker-blue")
		}
		else {
			this.outcome.innerHTML = "Success!";
			this.outcome.classList.add("marker-yellow")
		}

		if (!this.die1) return;
		this.die1.className = `fa-solid ${this.diceToClass(d1)}`;

		if (!this.die2) return;
		this.die2.className = `fa-solid ${this.diceToClass(d2)}`;

		if (!this.totalScore) return;
		this.totalScore.innerHTML = `${total}`;
	}

	private onClick() {
		const d1 = Math.floor(Math.random() * 6) + 1;
		const d2 = Math.floor(Math.random() * 6) + 1;
		const total = d1 + d2 + this.currentPower;

		if (!this.diceContainer) return;

		this.diceContainer.classList.remove('rolling');
		void this.diceContainer.offsetWidth;
		this.diceContainer.classList.add('rolling');

		setTimeout(() => this.updateOutcome(d1, d2, total), 250);
	}

	init(ctx: WindowContext): void {
		this.activeTagsDiv = ctx.body.querySelector('#active-tags')! as HTMLElement;
		this.totalPowerSpan = ctx.body.querySelector('#total-power')! as HTMLElement;
		this.rollBtn = ctx.body.querySelector('#roll-btn')!;
		this.totalScore = ctx.body.querySelector('#total-score')! as HTMLElement;
		this.outcome = ctx.body.querySelector('#outcome-text')! as HTMLElement;
		this.die1 = ctx.body.querySelector('#die1')! as HTMLElement;
		this.die2 = ctx.body.querySelector('#die2')! as HTMLElement;
		this.diceContainer = ctx.body.querySelector('#dice-result-container-element')! as HTMLElement;

		EventBus.instance.on('TAGS_UPDATED', (tags: any[]) => this.onTags(tags));
		this.rollBtn.addEventListener('click', () => this.onClick());
	}
}

export function diceWindow(x: number, y: number): any {
	return {
		title: 'Action / Dice Roller',
		x: x,
		y: y,
		width: 300, height: 450,
		template: diceTemplate,
		services: [new DiceService()]
	}
}
