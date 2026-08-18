import GLib from "gi://GLib";
import { execAsync } from "ags/process";
import type { ThemeProperties } from "./types";

export class ThemeApplicator {
  async applyTheme(
    imagePath: string,
    analysis: ThemeProperties,
  ): Promise<void> {
    await Promise.all([this.applyMatugen(imagePath, analysis)]);

    this.sendNotification(imagePath, analysis).catch((error) => {
      console.warn("Failed to send theme notification:", error);
    });
  }

  private async applyMatugen(
    imagePath: string,
    analysis: ThemeProperties,
  ): Promise<void> {
    const matugen = GLib.find_program_in_path("matugen");
    if (!matugen) {
      console.warn("matugen not found, skipping color theme generation");
      return;
    }

    try {
      await execAsync([
        matugen,
        "-t",
        analysis.scheme,
        "-m",
        analysis.mode,
        "--source-color-index",
        "0",
        "image",
        imagePath,
      ]);
    } catch (error) {
      console.error("Failed to run matugen:", error);
      throw error;
    }
  }

  private async sendNotification(
    imagePath: string,
    analysis: ThemeProperties,
  ): Promise<void> {
    const notifySend = GLib.find_program_in_path("notify-send");
    if (!notifySend) return;

    const basename = GLib.path_get_basename(imagePath);
    const message = `Theme: ${analysis.mode} ${analysis.scheme}`;

    execAsync(
      `${notifySend} "Colors and Wallpaper updated" "Image: ${basename}\n${message}"`,
    );
  }
}
