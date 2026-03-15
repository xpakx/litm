import { type WindowContext, type Service, type WindowConfig, type ComponentContext } from "../app.js";
import { componentOf, HTMLComponent } from "../html-component.js";
import { computed, signal, trigger, type Signal } from "../signal.js";
import diceTemplate from './dice.html'; 

class DiceService implements Service {
        diceClasses = ['fa-dice-one', 'fa-dice-two', 'fa-dice-three', 'fa-dice-four', 'fa-dice-five', 'fa-dice-six'];

	totalScore = signal(0);
	outcomeText = signal('');
	outcomeClass = signal('');

	die1 = signal(6);
	die2 = signal(6);
	die1Class = computed(() => this.getDiceClass(this.die1), [this.die1]);
	die2Class = computed(() => this.getDiceClass(this.die2), [this.die2]);

	rollAnimation = trigger(); 

	activeTags = signal<any[]>([]);

	adHocPower = signal(0);
	tagPower = computed(() => this.activeTags().reduce((sum, tag) => sum + tag.value, 0), [this.activeTags]);
	currentPower = computed(() => this.tagPower() + this.adHocPower(), [this.tagPower, this.adHocPower]);
	powerColor = computed(() => this.getPowerColor(), [this.currentPower]);

	isRolling = false;

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

	private onTag(tag: any, added: boolean) {
		let tags = this.activeTags();
		if (added) tags = [...tags, tag];
		if (!added) tags = tags.filter((t) => t.name !== tag.name);
		this.activeTags.set(tags);
	}

	private getPowerColor(): string {
		const power = this.currentPower();
		if (power == 0) return '';
		if (power < 0) return '#f38ba8' ;
		return  '#a6e3a1'
	}

	private getDiceClass(die: Signal<number>): string {
		return this.diceClasses[die() - 1]!;
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

		this.die1.set(d1);
		this.die2.set(d2);
		this.totalScore.set(total);
		this.isRolling = false;
	}

	private onClick() {
		if (this.isRolling) return;
		this.isRolling = true;

		const d1 = Math.floor(Math.random() * 6) + 1;
		const d2 = Math.floor(Math.random() * 6) + 1;
		const total = d1 + d2 + this.currentPower();

		this.rollAnimation();
		setTimeout(() => this.updateOutcome(d1, d2, total), 250);
	}

	updateAdHocPower(delta: number) {
		this.adHocPower.update((val: number) => val + delta);
	}

	init(ctx: ComponentContext): void {
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

		ctx.bus.on('tag:add', (tag: any) => this.onTag(tag, true));
		ctx.bus.on('tag:remove', (tag: any) => this.onTag(tag, false));
		component.onClick('roll-btn', () => this.onClick());
		component.onClick('sub-power-btn', () => this.updateAdHocPower(-1));
		component.onClick('add-power-btn', () => this.updateAdHocPower(1));
	}
}

export function diceWindow(x: number, y: number): WindowConfig {
	return {
		title: 'Action / Dice Roller',
		x: x,
		y: y,
		width: 300, height: 450,
		// template: diceTemplate,
		services: [new DiceService()],
		element: componentOf('win-dice', diceTemplate),
		dockable: true,
		dockAreas: ['sidebar'],
	}
}
