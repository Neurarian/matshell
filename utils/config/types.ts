import { Accessor } from "ags";

export interface ConfigDefinition<T> {
  defaultValue: T;
  useCache?: boolean;
  autoSave?: boolean;
}

export interface TypedConfigOption<T> extends Accessor<T> {
  readonly optionName: string;
  readonly defaultValue: T;
  readonly useCache: boolean;
  readonly autoSave: boolean;
  value: T;
  get(): T;
  set(value: T): void;
  subscribe(cb: (v: T) => void): () => void;
}

export interface OptionChoice {
  label: string;
  value: string;
}

export interface OptionSelectProps {
  option: string;
  label: string;
  choices: OptionChoice[];
}

export interface OptionToggleProps {
  option: string;
  label: string;
  icon?: string | null;
}
