import { type ComponentConfig, type ComponentContext, type Service } from "../app.js";
import { EventBus } from "../event-bus.js";
import { componentOf, computed, deepSignal, HTMLComponent, signal, type ReadonlySignal, type Signal } from "../html-component.js";
import tagTemplate from './tag.html';

interface Tag {
	name: string;
	weakness: boolean;
	main: boolean;
}

export class TagService implements Service {
	tagData: Signal<Tag>;
	tagName: Signal<string>;
	className: ReadonlySignal<string>;
	colorClass: ReadonlySignal<string>;
	isSelected = signal(false);

	constructor(tagSignal: Signal<Tag>) {
		this.tagData = tagSignal;
		this.tagName = deepSignal(this.tagData, 'name');
		this.className = computed(() => this.getClassName(), [this.tagData]);
		this.colorClass = computed(() => this.getColorClass(), [this.tagData]);
	}

	private getClassName(): string {
		const tag = this.tagData();
		if (tag.main) return 'item-main';
		if (tag.weakness) return 'item-weakness';
		return 'item-sub';
	}

	private getColorClass(): string {
		const tag = this.tagData();
		if (tag.weakness) return 'marker-peach';
		return 'marker-yellow';
	}

	init(ctx: ComponentContext): void {
		const component = ctx.body as HTMLComponent;
		component.bindClass('tag-btn', 'selected', this.isSelected);
		component.onClick('tag-btn', () => this.select());
		component.bindContent('tag-btn', this.tagName);
		component.bindDynamicClass('tag-btn', this.className);
		component.bindDynamicClass('tag-btn', this.colorClass);
	}

	select() {
		this.isSelected.update((val) => !val);
		const tag = this.tagData();

		const busEvent = {
			name: tag.name,
			type: tag.weakness ? 'weakness' : 'power',
			value: tag.weakness ? -1 : 1
		};

		const eventKey = this.isSelected() ? 'TAG_ADDED' : 'TAG_REMOVED';
		EventBus.instance.emit(eventKey, busEvent);
	}
}

export function tagComponent(tag: Signal<Tag>): ComponentConfig {
	return {
		services: [new TagService(tag)],
		element: componentOf("tag-component", tagTemplate),
    }
}
