import { readFile, writeFile } from "ags/file";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import { ConfigValue } from "./types.ts";

export class FileOperations {
  static ensureDirectory(path: string): void {
    !GLib.file_test(path, GLib.FileTest.EXISTS) &&
      Gio.File.new_for_path(path).make_directory_with_parents(null);
  }

  static loadConfigFromFile(filePath: string): Record<string, ConfigValue> {
    if (!this.fileExists(filePath)) {
      console.log(`Configuration file doesn't exist: ${filePath}`);
      return {};
    }

    try {
      const fileContent = readFile(filePath);
      if (!fileContent || fileContent.trim() === "") {
        console.log(`Configuration file is empty: ${filePath}`);
        return {};
      }

      const config = JSON.parse(fileContent);
      return config;
    } catch (err) {
      console.error(`Failed to load configuration from ${filePath}:`, err);
      return {};
    }
  }

  static saveConfigToFile(
    filePath: string,
    config: Record<string, ConfigValue>,
  ): void {
    try {
      const directory = filePath.split("/").slice(0, -1).join("/");
      if (directory) {
        this.ensureDirectory(directory);
      }

      writeFile(filePath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error(`Failed to save configuration to ${filePath}:`, err);
      throw err;
    }
  }

  static saveConfigToFileIfChanged(
    filePath: string,
    newConfig: Record<string, ConfigValue>,
  ): boolean {
    try {
      if (!this.fileExists(filePath)) {
        this.saveConfigToFile(filePath, newConfig);
        console.log("Created new configuration file with defaults");
        return true;
      }

      // Read existing config to compare
      const existingConfig = this.loadConfigFromFile(filePath);
      let hasChanges = false;
      for (const [key, value] of Object.entries(newConfig)) {
        if (JSON.stringify(existingConfig[key]) !== JSON.stringify(value)) {
          hasChanges = true;
          break;
        }
      }

      if (hasChanges) {
        this.saveConfigToFile(filePath, newConfig);
        return true;
      } else {
        console.log("No configuration changes to save");
        return false;
      }
    } catch (err) {
      console.error(`Failed to save configuration: ${err}`);
      throw err;
    }
  }

  static fileExists(path: string): boolean {
    return GLib.file_test(path, GLib.FileTest.EXISTS);
  }
}
