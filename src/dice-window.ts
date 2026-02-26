import { type WindowContext, type Service } from "./app.js";
import { EventBus } from "./event-bus.js";
import diceTemplate from './dice.html'; 

class DiceService implements Service {
	currentPower: number = 0;
        diceClasses = ['fa-dice-one', 'fa-dice-two', 'fa-dice-three', 'fa-dice-four', 'fa-dice-five', 'fa-dice-six'];


	private tagComponent(tag: any): string {
		const color = tag.type === 'power' ? '#a6e3a1' : '#f38ba8';
		const style = `font-size: 0.9em; margin-bottom: 3px; color: ${color}`;
		const value = `${tag.value > 0 ? '+' : ''}${tag.value} ${tag.name}`
		return `<div style="${style}">${value}</div>`
	}

	private diceToClass(result: number): string {
		return this.diceClasses[result - 1]!;
	}


	private onTags(tags: any[], activeTagsDiv: HTMLElement, totalPowerSpan: HTMLElement) {
		activeTagsDiv.innerHTML = tags.map(t => this.tagComponent(t)).join('');
		this.currentPower = tags.reduce((sum, tag) => sum + tag.value, 0);
		totalPowerSpan.innerText = this.currentPower.toString();
		totalPowerSpan.style.color = this.currentPower < 0 ? '#f38ba8' : '#a6e3a1';
	}

	private onClick(totalScoreDiv: HTMLElement, outcomeDiv: HTMLElement, die1: HTMLElement, die2: HTMLElement) {
		const d1 = Math.floor(Math.random() * 6) + 1;
		const d2 = Math.floor(Math.random() * 6) + 1;
		const total = d1 + d2 + this.currentPower;

		if (total <= 6) {
			outcomeDiv.innerHTML = "Miss...";
			outcomeDiv.classList.remove("marker-yellow")
			outcomeDiv.classList.remove("marker-blue")
			outcomeDiv.classList.add("marker-peach")
		} else if (total <= 9) { 
			outcomeDiv.innerHTML = "Mixed Success";
			outcomeDiv.classList.remove("marker-yellow")
			outcomeDiv.classList.remove("marker-peach")
			outcomeDiv.classList.add("marker-blue")
		}
		else {
			outcomeDiv.innerHTML = "Success!";
			outcomeDiv.classList.remove("marker-blue")
			outcomeDiv.classList.remove("marker-peach")
			outcomeDiv.classList.add("marker-yellow")
		}
                die1.className = `fa-solid ${this.diceToClass(d1)}`;
                die2.className = `fa-solid ${this.diceToClass(d2)}`;



		totalScoreDiv.innerHTML = `${total}`;
	}

	init(ctx: WindowContext): void {
		const activeTagsDiv = ctx.body.querySelector('#active-tags')! as HTMLElement;
		const totalPowerSpan = ctx.body.querySelector('#total-power')! as HTMLElement;
		const rollBtn = ctx.body.querySelector('#roll-btn')!;

		const totalScore = ctx.body.querySelector('#total-score')! as HTMLElement;
		const outcome = ctx.body.querySelector('#outcome-text')! as HTMLElement;
		const die1 = ctx.body.querySelector('#die1')! as HTMLElement;
		const die2 = ctx.body.querySelector('#die2')! as HTMLElement;

		EventBus.instance.on('TAGS_UPDATED', (tags: any[]) => this.onTags(tags, activeTagsDiv, totalPowerSpan));
		rollBtn.addEventListener('click', () => this.onClick(totalScore, outcome, die1, die2));
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
