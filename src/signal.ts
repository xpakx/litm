export interface Signal<T> {
	(): T;
	set(value: T): void;
	update(fn: (v: T) => T): void;
	subscribe(fn: (v: T) => void): () => void;
}

export function signal<T>(initialValue: T): Signal<T> {
	let _value = initialValue;
	const _subscribers = new Set<(v: T) => void>();

	const signal = (() => {
		return _value;
	}) as Signal<T>;

	signal.set = (newValue: T) => {
		if (_value === newValue) return;
		_value = newValue;
		_subscribers.forEach(fn => fn(_value));
	};

	signal.update = (updater: (v: T) => T) => {
		signal.set(updater(_value));
	};

	signal.subscribe = (fn: (v: T) => void) => {
		_subscribers.add(fn);
		fn(_value);
		return () => _subscribers.delete(fn);
	};

	return signal;
}

export interface Trigger {
	(): void;
	subscribe(fn: () => void): () => void;
}

export function trigger(): Trigger {
	const _subscribers = new Set<() => void>();

	const t = (() => {
		_subscribers.forEach(fn => fn());
	}) as Trigger;

	t.subscribe = (fn: () => void) => {
		_subscribers.add(fn);
		return () => _subscribers.delete(fn);
	};

	return t;
}

export interface ReadonlySignal<T> {
	(): T;
	subscribe(fn: (v: T) => void): () => void;
}

export function computed<T>(computeFn: () => T, dependencies: Signal<any>[] | ReadonlySignal<any>[]): ReadonlySignal<T> {
	let _value = computeFn();
	const _subscribers = new Set<(v: T) => void>();

	const compSignal = (() => _value) as ReadonlySignal<T>;

	const update = () => {
		const newValue = computeFn();
		if (_value !== newValue) {
			_value = newValue;
			_subscribers.forEach(fn => fn(_value));
		}
	};

	dependencies.forEach(dep => dep.subscribe(update));

	compSignal.subscribe = (fn: (v: T) => void) => {
		_subscribers.add(fn);
		fn(_value);
		return () => _subscribers.delete(fn);
	};

	return compSignal;
}

export function deepSignal<TParent extends object, K extends keyof TParent>(
	parent: Signal<TParent>,
	key: K
): Signal<TParent[K]> {
	const _subscribers = new Set<(v: TParent[K]) => void>();

	let _lastValue = parent()[key];

	const ds = (() => {
		return parent()[key];
	}) as Signal<TParent[K]>;

	parent.subscribe((newParent) => {
		const newValue = newParent[key];
		if (newValue !== _lastValue) {
			_lastValue = newValue;
			_subscribers.forEach(fn => fn(_lastValue));
		}
	});

	ds.set = (newValue: TParent[K]) => {
		if (_lastValue === newValue) return;

		parent.update(oldParent => ({
			...oldParent,
			[key]: newValue
		}));
	};

	ds.update = (fn: (v: TParent[K]) => TParent[K]) => {
		ds.set(fn(parent()[key]));
	};

	ds.subscribe = (fn: (v: TParent[K]) => void) => {
		_subscribers.add(fn);
		fn(parent()[key]);
		return () => _subscribers.delete(fn);
	};

	return ds;
}


export interface ListSignal<T> extends Signal<T[]> {
	push(item: T): void;
	removeAt(index: number): void;
	remove(item: T): void;
	clear(): void;
	updateAt(index: number, updater: (oldItem: T) => T): void;
	setAt(index: number, item: T): void;
}

export function listSignal<T>(initialValue: T[]): ListSignal<T> {
	const sig = signal(initialValue) as ListSignal<T>;

	sig.push = (item: T) => {
		sig.update(arr => [...arr, item]);
	};

	sig.removeAt = (index: number) => {
		sig.update(arr => arr.toSpliced(index, 1));
	};

	sig.remove = (item: T) => {
		sig.update(arr => arr.filter(i => i !== item));
	}

	sig.clear = () => {
		sig.set([]);
	}
	sig.setAt = (index: number, item: T) => {
		sig.update(arr => {
			if (index < 0 || index >= arr.length) return arr;
			const copy = [...arr];
			copy[index] = item;
			return copy;
		});
	};

	sig.updateAt = (index: number, updater: (oldItem: T) => T) => {
		sig.update(arr => {
			if (index < 0 || index >= arr.length) return arr;
			const copy = [...arr];
			copy[index] = updater(copy[index]!);
			return copy;
		});
	};

	return sig;
}
