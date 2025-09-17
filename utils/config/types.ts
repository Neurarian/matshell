export interface ConfigValueObject {
  [key: string]: ConfigValue;
}

export interface ConfigValueArray extends Array<ConfigValue> {}

export type ConfigValue =
  | string
  | number
  | boolean
  | ConfigValueObject
  | ConfigValueArray;

export interface IConfigOption {
  optionName: string;
  defaultValue: ConfigValue;
  useCache: boolean;
  autoSave: boolean;
  get value(): ConfigValue;
  set value(v: ConfigValue);
  subscribe(cb: (v: ConfigValue) => void): () => void;
}

export interface ConfigDefinition {
  defaultValue: ConfigValue;
  useCache?: boolean;
  autoSave?: boolean;
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
