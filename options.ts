import GLib from "gi://GLib?version=2.0";
import type { WeatherData } from "utils/weather";
import type { UsageEntry } from "utils/picker/frecency/types";
import { initializeConfig, defineOption } from "./utils/config";
import { CacheEntry } from "utils/wallpaper/LRUCache";
import { ThemeProperties } from "utils/wallpaper";

const options = initializeConfig(
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
    "bar.modules.cava.enable": defineOption(false),
    /* "catmull_rom", "smooth", "rounded", "bars","jumping_bars",
    "dots", "circular", "particles", "wave_particles","waterfall", "mesh" */
    "bar.modules.cava.style": defineOption("catmull_rom"),
    "bar.modules.clients.enable": defineOption(true),
    "bar.modules.media.cava.enable": defineOption(true),
    "bar.modules.os-icon.type": defineOption("nix-symbolic"), // "nix-symbolic" or "arch-symbolic"
    "bar.modules.os-icon.enable": defineOption(true),
    "hardware-monitor.notifications.enable": defineOption(true),
    "hardware-monitor.thresholds.cpu-temp": defineOption(85),
    "hardware-monitor.thresholds.gpu-temp": defineOption(85),
    "hardware-monitor.thresholds.memory": defineOption(0.95),
    "music-player.modules.cava.enable": defineOption(true),
    "music-player.modules.cava.style": defineOption("catmull_rom"),
    "notes.content": defineOption("", { useCache: true }),
    "notification-center.max-notifications": defineOption(4),
    "picker.frecency-cache": defineOption<Record<string, UsageEntry>>(
      {},
      { useCache: true },
    ),
      "picker.frecency-cache": defineOption<Record<string, UsageEntry>>(
        {},
        { useCache: true },
      ),
      "system-menu.modules.bluetooth-advanced.enable": defineOption(true),
      "system-menu.modules.wifi-advanced.enable": defineOption(true),
      "wallpaper.dir": defineOption(
        `${GLib.get_home_dir()}/Pictures/wallpapers`,
    "system-menu.modules.bluetooth-advanced.enable": defineOption(true),
    "system-menu.modules.wifi-advanced.enable": defineOption(true),
    "wallpaper.dir": defineOption(`${GLib.get_home_dir()}/Pictures/wallpapers`),
    "wallpaper.cache-size": defineOption(50),
    "wallpaper.theme.cache-size": defineOption(100),
    // Empty string placeholder - will be set by wallpaper service
    "wallpaper.current": defineOption("", {
      useCache: true,
    }),
    "wallpaper.theme.cache": defineOption<
      Record<string, CacheEntry<ThemeProperties>>
    >({}, { useCache: true }),
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

export default options;
