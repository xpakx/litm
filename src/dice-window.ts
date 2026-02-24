import { type WindowContext, type Service } from "./app.js";
import { EventBus } from "./event-bus.js";

class DiceService implements Service {
	currentPower: number = 0;

	private tagComponent(tag: any): string {
		const color = tag.type === 'power' ? '#a6e3a1' : '#f38ba8';
		const style = `font-size: 0.9em; margin-bottom: 3px; color: ${color}`;
		const value = `${tag.value > 0 ? '+' : ''}${tag.value} ${tag.name}`
		return `<div style="${style}">${value}</div>`
	}


	private onTags(tags: any[], activeTagsDiv: HTMLElement, totalPowerSpan: HTMLElement) {
		activeTagsDiv.innerHTML = tags.map(t => this.tagComponent(t)).join('');
		this.currentPower = tags.reduce((sum, tag) => sum + tag.value, 0);
		totalPowerSpan.innerText = this.currentPower.toString();
		totalPowerSpan.style.color = this.currentPower < 0 ? '#f38ba8' : '#a6e3a1';
	}

	private resultComponent(d1: number, d2: number, color: string, total: number, outcome: string) {
		return`
		<div style="font-size: 2rem; color: #cdd6f4;">[${d1}] + [${d2}]</div>
		<div style="font-size: 0.9rem; color: #a6adc8;">Power: ${this.currentPower}</div>
		<div style="font-size: 2.5rem; font-weight: bold; color: ${color}; margin: 10px 0;">${total}</div>
		<div style="font-size: 1.1rem; color: ${color};">${outcome}</div>
		`
	}

	private onClick(resultDiv: HTMLElement) {
		const d1 = Math.floor(Math.random() * 6) + 1;
		const d2 = Math.floor(Math.random() * 6) + 1;
		const total = d1 + d2 + this.currentPower;

		let outcome = "";
		let color = "";

		if (total <= 6) { outcome = "Miss (Complication)"; color = "#f38ba8"; }
		else if (total <= 9) { outcome = "Weak Hit (Mixed Success)"; color = "#f9e2af"; }
		else { outcome = "Strong Hit (Full Success)"; color = "#a6e3a1"; }

		resultDiv.innerHTML = this.resultComponent(d1, d2, color, total, outcome);
	}

	init(ctx: WindowContext): void {
		const activeTagsDiv = ctx.body.querySelector('#active-tags')! as HTMLElement;
		const totalPowerSpan = ctx.body.querySelector('#total-power')! as HTMLElement;
		const rollBtn = ctx.body.querySelector('#roll-btn')!;
		const resultDiv = ctx.body.querySelector('#roll-result')! as HTMLElement;

		EventBus.instance.on('TAGS_UPDATED', (tags: any[]) => this.onTags(tags, activeTagsDiv, totalPowerSpan));
		rollBtn.addEventListener('click', () => this.onClick(resultDiv));
	}
}

export function diceWindow(x: number, y: number): any {
	return {
		title: 'Action / Dice Roller',
		x: x,
		y: y,
		width: 300, height: 450,
		template: `
		<div style="padding: 10px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
		<h4 style="margin: 0 0 10px 0; color: #cdd6f4;">Active Tags</h4>
		<div id="active-tags" style="min-height: 80px; background: #313244; padding: 5px; border-radius: 4px; margin-bottom: 10px;"></div>

		<div style="font-size: 1.2rem; margin-bottom: 10px; color: #cdd6f4;">
		Total Power: <strong id="total-power" style="color: #a6e3a1;">0</strong>
		</div>

		<button id="roll-btn" style="padding: 10px; background: #89b4fa; color: #11111b; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
		ROLL 2d6
		</button>

		<div id="roll-result" style="margin-top: 15px; text-align: center; flex-grow: 1;"></div>
		</div>
		`,
		services: [new DiceService()]
	}
}
