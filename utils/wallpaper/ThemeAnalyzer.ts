import GLib from "gi://GLib";
import { execAsync } from "ags/process";
import type { ThemeProperties } from "./types";

interface ThemeAnalysisStrategy {
  readonly name: string;
  canAnalyze(): boolean;
  analyze(imagePath: string): Promise<ThemeProperties | null>;
}

class ImageHctStrategy implements ThemeAnalysisStrategy {
  readonly name = "image-hct";

  canAnalyze(): boolean {
    return GLib.find_program_in_path("image-hct") !== null;
  }

  async analyze(imagePath: string): Promise<ThemeProperties | null> {
    try {
      const imageHct = GLib.find_program_in_path("image-hct")!;
      const output = await execAsync(
        `bash -c '${imageHct} "${imagePath}" tone; ${imageHct} "${imagePath}" chroma'`,
      );

      const lines = output.trim().split("\n");
      if (lines.length >= 2) {
        const tone = parseInt(lines[0].trim());
        const chroma = parseInt(lines[1].trim());

        return {
          tone,
          chroma,
          mode: tone > 60 ? "light" : "dark",
          scheme: chroma < 20 ? "scheme-neutral" : "scheme-vibrant",
        };
      }
      return null;
    } catch (error) {
      console.warn("image-hct analysis failed:", error);
      return null;
    }
  }
}

class ImageMagickStrategy implements ThemeAnalysisStrategy {
  readonly name = "ImageMagick";

  canAnalyze(): boolean {
    return (
      GLib.find_program_in_path("magick") !== null ||
      GLib.find_program_in_path("convert") !== null
    );
  }

  async analyze(imagePath: string): Promise<ThemeProperties | null> {
    const magick =
      GLib.find_program_in_path("magick") ||
      GLib.find_program_in_path("convert");
    if (!magick) return null;

    try {
      const bashCommand = `bash -c '
        BRIGHTNESS=$(${magick} "${imagePath}" -colorspace Gray -format "%[fx:mean]" info:)
        COLOR=$(${magick} "${imagePath}" -scale 1x1! -format "%[pixel:u.p{0,0}]" info:)
        echo "brightness:$BRIGHTNESS"
        echo "color:$COLOR"
      '`;

      const output = await execAsync(bashCommand);
      const lines = output.trim().split("\n");

      let brightness = 50;
      let isGrayscale = false;

      for (const line of lines) {
        if (line.startsWith("brightness:")) {
          brightness = Math.round(parseFloat(line.substring(11)) * 100);
        } else if (line.startsWith("color:")) {
          const colorMatch = line
            .substring(6)
            .match(/srgb\((\d+),(\d+),(\d+)\)/);
          if (colorMatch) {
            const [, r, g, b] = colorMatch.map(Number);
            const maxDiff = Math.max(
              Math.abs(r - g),
              Math.abs(r - b),
              Math.abs(g - b),
            );
            isGrayscale = maxDiff < 20;
          }
        }
      }

      return {
        tone: brightness,
        chroma: isGrayscale ? 10 : 40,
        mode: brightness > 50 ? "light" : "dark",
        scheme: isGrayscale ? "scheme-neutral" : "scheme-vibrant",
      };
    } catch (error) {
      console.warn("ImageMagick analysis failed:", error);
      return null;
    }
  }
}

export class ThemeAnalyzer {
  private strategies: ThemeAnalysisStrategy[];

  constructor() {
    this.strategies = [new ImageHctStrategy(), new ImageMagickStrategy()];
  }

  async analyzeImage(imagePath: string): Promise<ThemeProperties> {
    for (const strategy of this.strategies) {
      if (strategy.canAnalyze()) {
        const result = await strategy.analyze(imagePath);
        if (result) {
          console.log(`Theme analyzed with ${strategy.name}`);
          return result;
        }
      }
    }

    console.warn("No theme analyzer available, using defaults");
    return {
      tone: 0,
      chroma: 0,
      mode: "dark",
      scheme: "scheme-vibrant",
    };
  }
}
