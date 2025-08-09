import { monitorFile } from "ags/file";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import { ConfigOption } from "./option.ts";
import { CacheManager } from "./cache-manager.ts";
import { FileOperations } from "./io.ts";
import { ConfigValue, IConfigOption } from "./types.ts";

export class ConfigManager {
  private options = new Map<string, IConfigOption>();
  private cacheManager: CacheManager;
  private subscriptions: Map<string, () => void> = new Map();
  private loadedConfig: Record<string, ConfigValue> | null = null;

  constructor(public readonly configPath: string) {
    this.cacheManager = new CacheManager(`${GLib.get_user_cache_dir()}/ags`);
    const configDir = configPath.split("/").slice(0, -1).join("/");
    if (configDir) {
      FileOperations.ensureDirectory(configDir);
    }
  }

  // Load config once and cache it
  private getLoadedConfig(): Record<string, ConfigValue> {
    if (this.loadedConfig === null) {
      this.loadedConfig = FileOperations.loadConfigFromFile(this.configPath);
    }
    return this.loadedConfig;
  }

  private invalidateLoadedConfig(): void {
    this.loadedConfig = null;
  }

  createOption<T extends ConfigValue>(
    optionName: string,
    defaultValue: T,
    options: { useCache?: boolean; autoSave?: boolean } = {},
  ): ConfigOption<T> {
    !optionName.includes(".") &&
      console.warn(
        `Warning: Config key "${optionName}" doesn't use dot notation. This is allowed but not recommended.`,
      );

    const option = new ConfigOption<T>(optionName, defaultValue, options);
    this.options.set(optionName, option as IConfigOption);
    this.initializeOption(option);

    // Add auto-save for non-cached options
    if (!option.useCache && option.autoSave) {
      option.subscribe(() => {
        console.log(`Auto-saving due to change in ${optionName}`);
        this.save();
      });
    }

    return option;
  }

  private initializeOption<T extends ConfigValue>(
    option: ConfigOption<T>,
  ): void {
    let loadedValue: ConfigValue | undefined;

    if (option.useCache) {
      loadedValue = this.cacheManager.loadCachedValue(option.optionName);

      // Setup cache saving subscription
      if (this.subscriptions.has(option.optionName)) {
        const existingCleanup = this.subscriptions.get(option.optionName);
        existingCleanup && existingCleanup();
      }

      const cleanup = option.subscribe((value) => {
        this.cacheManager.saveCachedValue(option.optionName, value);
      });
      this.subscriptions.set(option.optionName, cleanup);
    } else {
      const config = this.getLoadedConfig();
      loadedValue = config[option.optionName];
    }

    if (loadedValue !== undefined) {
      option.value = loadedValue as T;
    }
  }

  save(): void {
    // Prepare config with all non-cached options
    const config: Record<string, ConfigValue> = {};
    for (const [optionName, option] of this.options.entries()) {
      if (!option.useCache) {
        config[optionName] = option.value;
      }
    }

    const saved = FileOperations.saveConfigToFileIfChanged(this.configPath, config);
    if (saved) {
      // Update cached config with new values
      this.loadedConfig = { ...config };
    }
  }

  load(): void {
    console.log(`Loading configuration from ${this.configPath}`);

    if (!FileOperations.fileExists(this.configPath)) {
      console.log(`Configuration file doesn't exist, creating with defaults`);
      this.save();
      return;
    }

    this.invalidateLoadedConfig();
    const config = this.getLoadedConfig();

    let loadedCount = 0;
    for (const [optionName, option] of this.options.entries()) {
      if (!option.useCache && config[optionName] !== undefined) {
        option.value = config[optionName];
        loadedCount++;
      }
    }
    console.log(`Applied ${loadedCount} settings from configuration file`);
  }

  watchChanges(): void {
    monitorFile(this.configPath, (_, event: Gio.FileMonitorEvent) => {
      if (
        event === Gio.FileMonitorEvent.CHANGED ||
        event === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
        event === Gio.FileMonitorEvent.ATTRIBUTE_CHANGED ||
        event === Gio.FileMonitorEvent.CREATED
      ) {
        console.log("Config file changed, reloading...");
        this.invalidateLoadedConfig();
        this.load();
      }
    });
  }

  getOption<T extends ConfigValue>(
    optionName: string,
  ): ConfigOption<T> | undefined {
    return this.options.get(optionName) as ConfigOption<T> | undefined;
  }
}
