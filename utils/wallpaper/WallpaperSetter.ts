import GLib from "gi://GLib";
import { Process, subprocess, execAsync } from "ags/process";

export interface WallpaperSetResult {
  success: boolean;
  error?: Error;
}

interface WallpaperStrategy {
  readonly name: string;
  canSet(): Promise<boolean>;
  setWallpaper(imagePath: string): Promise<WallpaperSetResult>;
  dispose?(): void;
}

class SwwwStrategy implements WallpaperStrategy {
  readonly name = "swww";
  private daemon: Process | null = null;

  async canSet(): Promise<boolean> {
    return GLib.find_program_in_path("swww") !== null;
  }

  async setWallpaper(imagePath: string): Promise<WallpaperSetResult> {
    try {
      if (!(await this.isDaemonRunning())) {
        await this.startDaemon();
      }

      await execAsync([
        "swww",
        "img",
        imagePath,
        "--transition-type",
        "fade",
        "--transition-duration",
        "1",
        "--transition-fps",
        "60",
      ]);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private async isDaemonRunning(): Promise<boolean> {
    try {
      await execAsync(["swww", "query"]);
      return true;
    } catch {
      return false;
    }
  }

  private async startDaemon(): Promise<void> {
    if (this.daemon) return;

    this.daemon = subprocess(
      ["swww-daemon"],
      (stdout: string) => {
        if (stdout.trim()) console.debug("swww-daemon:", stdout.trim());
      },
      (stderr: string) => {
        if (stderr.trim()) console.debug("swww-daemon:", stderr.trim());
      },
    );
  }

  dispose(): void {
    if (this.daemon) {
      try {
        this.daemon.kill();
        console.log("swww daemon stopped");
      } catch (error) {
        console.error("Failed to stop swww daemon:", error);
      } finally {
        this.daemon = null;
      }
    }
  }
}

class HyprpaperStrategy implements WallpaperStrategy {
  readonly name = "hyprpaper";

  async canSet(): Promise<boolean> {
    return GLib.find_program_in_path("hyprctl") !== null;
  }

  async setWallpaper(imagePath: string): Promise<WallpaperSetResult> {
    try {
      const hyprctl = GLib.find_program_in_path("hyprctl");
      if (!hyprctl) {
        return {
          success: false,
          error: new Error("hyprctl not found"),
        };
      }

      // Unload and get monitors in parallel
      const [, monitorOutput] = await Promise.all([
        execAsync([hyprctl, "hyprpaper", "unload", "all"]),
        execAsync([hyprctl, "monitors", "-j"]),
      ]);

      await execAsync([hyprctl, "hyprpaper", "preload", imagePath]);

      const monitors = JSON.parse(monitorOutput);
      await Promise.all(
        monitors.map((monitor: any) =>
          execAsync([
            hyprctl,
            "hyprpaper",
            "wallpaper",
            `${monitor.name},${imagePath}`,
          ]),
        ),
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

export class WallpaperSetter {
  private strategies: WallpaperStrategy[];

  constructor() {
    this.strategies = [new SwwwStrategy(), new HyprpaperStrategy()];
  }

  async setWallpaper(imagePath: string): Promise<WallpaperSetResult> {
    for (const strategy of this.strategies) {
      if (await strategy.canSet()) {
        const result = await strategy.setWallpaper(imagePath);

        if (result.success) {
          console.log(`Wallpaper set successfully with ${strategy.name}`);
          return result;
        }

        console.warn(`${strategy.name} failed:`, result.error?.message);
      }
    }

    return {
      success: false,
      error: new Error("No wallpaper setter available"),
    };
  }

  dispose(): void {
    this.strategies.forEach((strategy) => {
      strategy.dispose?.();
    });
  }
}
