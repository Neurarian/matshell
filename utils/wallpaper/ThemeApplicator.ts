import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { execAsync } from "ags/process";
import type { ThemeProperties } from "./types";
import { writeFileAsync } from "ags/file";

export class ThemeApplicator {
  async applyTheme(
    imagePath: string,
    analysis: ThemeProperties,
  ): Promise<void> {
    await Promise.all([
      this.applyMatugen(imagePath, analysis),
      this.writeThemeVariables(analysis),
    ]);

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
      await execAsync(
        `${matugen} -t "${analysis.scheme}" -m "${analysis.mode}" image "${imagePath}"`,
      );
    } catch (error) {
      console.error("Failed to run matugen:", error);
      throw error;
    }
  }

  private async writeThemeVariables(analysis: ThemeProperties): Promise<void> {
    try {
      const configDir = GLib.get_user_config_dir();
      const scssFile = `${configDir}/ags/style/abstracts/_theme_variables_matugen.scss`;

      const content = [
        "",
        "/* Theme mode and scheme variables */",
        `$darkmode: ${analysis.mode === "dark"};`,
        `$material-color-scheme: "${analysis.scheme}";`,
        "",
      ].join("\n");

      writeFileAsync(scssFile, content);
    } catch (error) {
      console.error("Failed to write theme variables:", error);
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
