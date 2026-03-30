import { type ComponentDefinition, type WindowConfig } from "./app.js";
import { componentOf } from "./html-component.js";

export class ComponentLibrary {
	private _components: Map<string, ComponentDefinition> = new Map();
	private nameCounter: number = 0;

	private getNextName(): string {
		return `add-dummy${this.nameCounter++}`;
	}

	register(name: string, config: ComponentDefinition) {
		if(config.template) {
			const template = config.template
			const generatedName = this.getNextName()
			config.elementFactory = () => componentOf(generatedName, template);
		} 
		this._components.set(name, config);
	}

	getWindowConfig(name: string): WindowConfig | undefined {
		const defaultConfig = this._components.get(name);
		if (!defaultConfig) return;
		const { elementFactory, servicesFactory, ...rest } = defaultConfig;
		let config: WindowConfig = {
			...rest,

		};
		if (elementFactory) config.element = elementFactory();
		if (servicesFactory) config.services = servicesFactory();
		
		return config;
	}
}

