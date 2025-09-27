import { ConfigManager } from "./manager.ts";
import { ConfigOption } from "./option.ts";
import { ConfigValue, ConfigDefinition } from "./types.ts";

let configManager: ConfigManager | null = null;

export function defineOption<T = ConfigValue>(
  defaultValue: T,
  config?: Omit<ConfigDefinition<T>, "defaultValue">,
): ConfigDefinition<T> {
  return {
    defaultValue,
    useCache: config?.useCache ?? false,
    autoSave: config?.autoSave ?? true,
  };
}

export function initializeConfig<
  TConfig extends Record<string, ConfigDefinition<any>>
>(
  configPath: string,
  config: TConfig,
): Record<keyof TConfig, ConfigOption<ConfigValue>> {
  configManager = new ConfigManager(configPath);

  const options: Record<string, ConfigOption<ConfigValue>> = {};

  for (const [path, def] of Object.entries(config)) {
    options[path] = configManager.createOption(path, def.defaultValue, {
      useCache: def.useCache,
      autoSave: def.autoSave,
    });
  }

  configManager.initialize();
  configManager.watchChanges();

  return options as Record<keyof TConfig, ConfigOption<ConfigValue>>;
}
