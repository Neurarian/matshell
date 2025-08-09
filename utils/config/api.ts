import { ConfigManager } from "./manager.ts";
import { ConfigOption } from "./option.ts";
import { ConfigValue, ConfigDefinition } from "./types.ts";

let configManager: ConfigManager | null = null;

export function defineOption<T extends ConfigValue>(
  defaultValue: T,
  options: { useCache?: boolean; autoSave?: boolean } = {},
): ConfigDefinition {
  return {
    defaultValue,
    useCache: options.useCache ?? false,
    autoSave: options.autoSave ?? true,
  };
}

export function initializeConfig(
  configPath: string,
  config: Record<string, ConfigDefinition>,
): Record<string, ConfigOption<ConfigValue>> {
  configManager = new ConfigManager(configPath);

  // Create options from flattened config
  const options: Record<string, ConfigOption<ConfigValue>> = {};

  for (const [path, def] of Object.entries(config)) {
    options[path] = configManager.createOption(path, def.defaultValue, {
      useCache: def.useCache,
      autoSave: def.autoSave,
    });
  }

  configManager.watchChanges();

  return options;
}

