import GLib from "gi://GLib?version=2.0";
import { execAsync } from "ags/process";
import type { WeatherData } from "utils/weather";
import type { CachedThemeEntry } from "utils/wallpaper/types";
import type { UsageEntry } from "utils/picker/frecency/types";
import { initializeConfig, defineOption } from "./utils/config";

const options = await (async () => {
  const currentWallpaper = await execAsync(
    "hyprctl hyprpaper listloaded",
  ).catch(() => "");

  const config = initializeConfig(
    `${GLib.get_user_config_dir()}/ags/config.json`,
    {
      "app.browser": defineOption("zen"),
      "app.file-manager": defineOption("nautilus"),
      "app.resource-monitor": defineOption("resources"),
      "app.terminal": defineOption("wezterm"),
      "app.wifi": defineOption(
        "XDG_CURRENT_DESKTOP=GNOME gnome-control-center wifi",
      ),
      "app.audio": defineOption("pwvucontrol"),
      "bar.position": defineOption("top"), // "top", "bottom"
      "bar.style": defineOption("expanded"), // "floating" or "expanded"
      "bar.modules.cava.show": defineOption(false),
      /* "catmull_rom", "smooth", "rounded", "bars","jumping_bars",
      "dots", "circular", "particles", "wave_particles","waterfall", "mesh" */
      "bar.modules.cava.style": defineOption("catmull_rom"),
      "bar.modules.media.cava.show": defineOption(true),
      "bar.modules.os-icon.type": defineOption("nix-symbolic"), // "nix-symbolic" or "arch-symbolic"
      "bar.modules.os-icon.show": defineOption(true),
      "musicPlayer.modules.cava.show": defineOption(true),
      "musicPlayer.modules.cava.style": defineOption("catmull_rom"),
      "notification-center.max-notifications": defineOption(4),
      "picker.frecency-cache": defineOption<Record<string, UsageEntry>>(
        {},
        { useCache: true },
      ),
      "system-menu.modules.bluetooth-advanced.enable": defineOption(true),
      "system-menu.modules.wifi-advanced.enable": defineOption(true),
      "wallpaper.dir": defineOption(
        `${GLib.get_home_dir()}/Pictures/wallpapers`,
      ),
      "wallpaper.cache-size": defineOption(50),
      "wallpaper.theme-cache-size": defineOption(100),
      "wallpaper.current": defineOption(currentWallpaper, {
        useCache: true,
      }),
      "wallpaper.theme-cache": defineOption<Record<string, CachedThemeEntry>>(
        {},
        { useCache: true },
      ),
      "weather.update-interval": defineOption(900_000),
      "weather.cache": defineOption<
        Record<
          string,
          {
            data: WeatherData;
            timestamp: number;
          }
        >
      >({}, { useCache: true }),
    },
  );
  return config;
})();

export default options;
