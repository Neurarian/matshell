import { Accessor } from "ags";
import { ConfigValue, IConfigOption } from "./types.js";

// Reactive configuration option
export class ConfigOption<T extends ConfigValue>
  extends Accessor<T>
  implements IConfigOption
{
  #value: T;
  #subs = new Set<(v: T) => void>();

  readonly optionName: string;
  readonly defaultValue: T;
  readonly useCache: boolean;
  readonly autoSave: boolean;

  constructor(
    optionName: string,
    defaultValue: T,
    opts: { useCache?: boolean; autoSave?: boolean } = {},
  ) {
    super(
      () => this.#value,
      (cb) => this.#subscribe(cb),
    );

    this.#value = defaultValue;
    this.optionName = optionName;
    this.defaultValue = defaultValue;
    this.useCache = opts.useCache ?? false;
    this.autoSave = opts.autoSave ?? true;
  }

  get value(): T {
    return this.#value;
  }
  set value(v: T) {
    this.set(v);
  }

  set(v: T) {
    if (Object.is(this.#value, v)) return;
    this.#value = v;
    this.#subs.forEach((cb) => cb(v));
  }

  subscribe(cb: (v: T) => void): () => void {
    return this.#subscribe(cb);
  }

  #subscribe(cb: (v: T) => void): () => void {
    this.#subs.add(cb);
    return () => this.#subs.delete(cb);
  }
}
