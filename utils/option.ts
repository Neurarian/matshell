import { Accessor } from "ags";
import { readFile, readFileAsync, writeFile, monitorFile } from "ags/file";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";

/**
 * Configuration manager for ags
 *
 * To keep it simple, configuration exclusively
 * uses flattened dot notation for paths:
 * {
 *   "section.subsection.option": "value",
 *   "section.another.option": 123
 * }
 */
export interface ConfigValueObject {
  [key: string]: ConfigValue;
}
export interface ConfigValueArray extends Array<ConfigValue> {}

export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValueObject
  | ConfigValueArray;

interface IConfigOption {
  optionName: string;
  defaultValue: ConfigValue;
  useCache: boolean;
  autoSave: boolean;
  get value(): ConfigValue;
  set value(v: ConfigValue);
  subscribe(cb: (v: ConfigValue) => void): () => void;
}

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

// Configuration manager
export class ConfigManager {
  private options = new Map<string, IConfigOption>();
  private cacheDir: string;
  private lastLoadTime: number = 0;
  private subscriptions: Map<string, () => void> = new Map();

  constructor(public readonly configPath: string) {
    this.cacheDir = `${GLib.get_user_cache_dir()}/ags`;
    this.ensureDirectory(this.cacheDir);
    this.ensureDirectory(configPath.split("/").slice(0, -1).join("/"));
  }

  // Create and register option
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

  // Initialize option from saved values
  private initializeOption<T extends ConfigValue>(
    option: ConfigOption<T>,
  ): void {
    const filePath = option.useCache
      ? `${this.cacheDir}/options.json`
      : this.configPath;

    if (GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
      try {
        const config = JSON.parse(readFile(filePath) || "{}");
        if (config[option.optionName] !== undefined) {
          option.value = config[option.optionName] as T;
        }
      } catch (err) {
        console.error(`Failed to initialize option ${option.optionName}:`, err);
      }
    }

    // Setup cache saving with proper cleanup handling
    if (option.useCache) {
      // Clean up any existing subscription first
      if (this.subscriptions.has(option.optionName)) {
        const existingCleanup = this.subscriptions.get(option.optionName);
        existingCleanup && existingCleanup();
      }

      // Create new subscription and store the cleanup function
      const cleanup = option.subscribe((value) => {
        this.saveCachedValue(option.optionName, value);
      });

      this.subscriptions.set(option.optionName, cleanup);
    }
  }

  // Save a cached value
  private saveCachedValue(optionName: string, value: ConfigValue): void {
    readFileAsync(`${this.cacheDir}/options.json`)
      .then((content: string) => {
        const cache = JSON.parse(content || "{}");
        cache[optionName] = value;
        writeFile(
          `${this.cacheDir}/options.json`,
          JSON.stringify(cache, null, 2),
        );
      })
      .catch((err) => {
        console.error(`Failed to save cached value for ${optionName}:`, err);
      });
  }

  // Ensure directory exists
  private ensureDirectory(path: string): void {
    !GLib.file_test(path, GLib.FileTest.EXISTS) &&
      Gio.File.new_for_path(path).make_directory_with_parents(null);
  }

  // Save all non-cached configuration values to file
  save(): void {
    try {
      // Check if file exists
      const fileExists = GLib.file_test(this.configPath, GLib.FileTest.EXISTS);

      if (!fileExists) {
        // Simply create a new file with all non-cached options
        const newConfig: Record<string, ConfigValue> = {};
        for (const [optionName, option] of this.options.entries()) {
          if (!option.useCache) {
            newConfig[optionName] = option.value;
          }
        }
        writeFile(this.configPath, JSON.stringify(newConfig, null, 2));
        console.log("Created new configuration file with defaults");
        return;
      }

      // Read existing config to compare
      const existingConfig = JSON.parse(readFile(this.configPath) || "{}");

      // Prepare new config
      const newConfig: Record<string, ConfigValue> = {};
      let hasChanges = false;

      for (const [optionName, option] of this.options.entries()) {
        if (!option.useCache) {
          newConfig[optionName] = option.value;

          // Check if this value changed
          if (
            JSON.stringify(existingConfig[optionName]) !==
            JSON.stringify(option.value)
          ) {
            hasChanges = true;
          }
        }
      }

      // Only write the file if there are changes
      if (hasChanges) {
        writeFile(this.configPath, JSON.stringify(newConfig, null, 2));
        console.log("Saved configuration changes");
      } else {
        console.log("No configuration changes to save");
      }
    } catch (err) {
      console.error(`Failed to save configuration: ${err}`);
    }
  }

  // Load all configuration values from file
  load(): void {
    console.log(`Loading configuration from ${this.configPath}`);

    if (!GLib.file_test(this.configPath, GLib.FileTest.EXISTS)) {
      console.log(`Configuration file doesn't exist, creating with defaults`);
      this.save();
      return;
    }

    try {
      const fileContent = readFile(this.configPath);
      if (!fileContent || fileContent.trim() === "") {
        console.log(`Configuration file is empty, using defaults`);
        this.save();
        return;
      }

      const config = JSON.parse(fileContent);
      console.log(
        `Loaded configuration with ${Object.keys(config).length} settings`,
      );

      let loadedCount = 0;
      for (const [optionName, option] of this.options.entries()) {
        if (!option.useCache && config[optionName] !== undefined) {
          option.value = config[optionName];
          loadedCount++;
        }
      }

      // Record the time when we loaded the file
      const fileInfo = Gio.File.new_for_path(this.configPath).query_info(
        "time::modified",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );
      this.lastLoadTime = fileInfo.get_modification_time().tv_sec;

      console.log(`Applied ${loadedCount} settings from configuration file`);
    } catch (err) {
      console.error(`Failed to load configuration: ${err}`);
    }
  }

  // Watch for configuration file changes
  watchChanges(): void {
    monitorFile(this.configPath, (_, event: Gio.FileMonitorEvent) => {
      if (
        event === Gio.FileMonitorEvent.CHANGED ||
        event === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
        event === Gio.FileMonitorEvent.ATTRIBUTE_CHANGED ||
        event === Gio.FileMonitorEvent.CREATED
      ) {
        console.log("Config file changed, reloading...");
        this.load();
      }
    });
  }

  // Get an option by optionName
  getOption<T extends ConfigValue>(
    optionName: string,
  ): ConfigOption<T> | undefined {
    return this.options.get(optionName) as ConfigOption<T> | undefined;
  }
}

// Global configuration manager instance
let configManager: ConfigManager | null = null;

// Public API

/**
 * Define a configuration option with metadata
 */
export function defineOption<T extends ConfigValue>(
  defaultValue: T,
  options: { useCache?: boolean; autoSave?: boolean } = {},
): { defaultValue: T; useCache?: boolean; autoSave?: boolean } {
  return {
    defaultValue,
    useCache: options.useCache,
    autoSave: options.autoSave,
  };
}

/**
 * Initializes configuration with flattened dot notation
 */
export function initializeConfig(
  configPath: string,
  config: Record<
    string,
    { defaultValue: ConfigValue; useCache?: boolean; autoSave?: boolean }
  >,
): Record<string, ConfigOption<ConfigValue>> {
  // Create the config manager
  configManager = new ConfigManager(configPath);

  // Create options from flattened config
  const options: Record<string, ConfigOption<ConfigValue>> = {};

  for (const [path, def] of Object.entries(config)) {
    options[path] = configManager.createOption(path, def.defaultValue, {
      useCache: def.useCache,
      autoSave: def.autoSave,
    });
  }

  // Load the saved values
  configManager.load();

  // Set up file watching
  configManager.watchChanges();

  return options;
}

/**
 * Manually save all configuration options to disk
 */
export function saveConfig(): void {
  configManager && configManager.save();
}

/**
 * Get a specific configuration option by path
 */
export function retrieveOption<T extends ConfigValue>(
  path: string,
): ConfigOption<T> | undefined {
  if (!configManager) {
    throw new Error(
      "Configuration not initialized. Call initializeConfig first.",
    );
  }

  return configManager.getOption<T>(path);
}
