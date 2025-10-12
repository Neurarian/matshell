import { FileOperations } from "./io.js";

export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    FileOperations.ensureDirectory(cacheDir);
  }

  // serialize to JSON
  saveCachedValue<T>(optionName: string, value: T): void {
    try {
      const cachePath = this.getCachePath();
      const cache = FileOperations.loadConfigFromFile(cachePath);
      cache[optionName] = value;
      FileOperations.saveConfigToFile(cachePath, cache);
    } catch (err) {
      console.error(`Failed to save cached value for ${optionName}:`, err);
    }
  }

  // Load and cast cached value to T
  loadCachedValue<T>(optionName: string): T | undefined {
    const cachePath = this.getCachePath();
    if (!FileOperations.fileExists(cachePath)) {
      return undefined;
    }

    try {
      const cache = FileOperations.loadConfigFromFile(cachePath);
      return cache[optionName] as T | undefined;
    } catch (err) {
      console.error(`Failed to load cached value for ${optionName}:`, err);
      return undefined;
    }
  }

  getCachePath(): string {
    return `${this.cacheDir}/options.json`;
  }
}
