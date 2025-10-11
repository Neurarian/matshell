import GObject, { register } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import { readFileAsync } from "ags/file";

// Config
export const MonitorConfig = {
  UPDATE_INTERVAL: 1000,
  DISK_UPDATE_INTERVAL: 5000,
  HIGH_CPU_THRESHOLD: 0.9,
  HIGH_MEMORY_THRESHOLD: 0.85,
  THRESHOLD_DEBOUNCE_MS: 3000,
} as const;

/**
 * Base class for all hardware monitors
 * @abstract
 */
@register()
export class HardwareMonitor extends GObject.Object {
  protected intervalId: number | null = null;
  protected destroyed = false;

  async update(): Promise<void> {
    throw new Error("update() must be implemented by subclass");
  }

  protected startMonitoring(interval: number): void {
    if (this.intervalId !== null) return;

    this.intervalId = GLib.timeout_add(GLib.PRIORITY_LOW, interval, () => {
      if (this.destroyed) return GLib.SOURCE_REMOVE;

      this.update().catch((error) => {
        console.error(`${this.constructor.name} update failed:`, error);
      });

      return GLib.SOURCE_CONTINUE;
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.intervalId !== null) {
      GLib.source_remove(this.intervalId);
      this.intervalId = null;
    }
  }
}

export class ByteFormatter {
  private static readonly UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

  static format(bytes: number): string {
    if (bytes === 0) return "0 B";
    if (bytes < 0) return "Invalid";

    const exp = Math.floor(Math.log(bytes) / Math.log(1024));
    const clampedExp = Math.min(exp, this.UNITS.length - 1);
    const value = bytes / Math.pow(1024, clampedExp);

    return `${Math.round(value * 100) / 100} ${this.UNITS[clampedExp]}`;
  }
}

export async function safeReadFile(path: string): Promise<string | null> {
  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
    return null;
  }

  try {
    return await readFileAsync(path);
  } catch (error) {
    console.error(`Failed to read file ${path}:`, error);
    return null;
  }
}

export function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}
