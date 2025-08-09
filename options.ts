import GLib from "gi://GLib?version=2.0";
import { execAsync } from "ags/process";
import { initializeConfig, defineOption } from "./utils/config";

const options = await (async () => {
  const currentWallpaper = await execAsync(
    "hyprctl hyprpaper listloaded",
  ).catch(() => "");

  const config = initializeConfig(
    `${GLib.get_user_config_dir()}/ags/config.json`,
    {
      "wallpaper.folder": defineOption(
        `${GLib.get_home_dir()}/Pictures/wallpapers`,
      ),
      "wallpaper.current": defineOption(currentWallpaper, {
        useCache: true,
      }),
      "bar.position": defineOption("top"), // "top", "bottom"
      "bar.style": defineOption("expanded"), // "floating" or "expanded"
      "bar.modules.cava.show": defineOption(false),
      /* "catmull_rom", "smooth", "rounded", "bars","jumping_bars",
      "dots", "circular", "particles", "wave_particles","waterfall", "mesh" */
      "bar.modules.cava.style": defineOption("catmull_rom"),
      "bar.modules.media.cava.show": defineOption(true),
      "bar.modules.showOsIcon": defineOption(true),
      "musicPlayer.modules.cava.show": defineOption(true),
      "musicPlayer.modules.cava.style": defineOption("catmull_rom"),
      "system-menu.modules.bluetooth.enableOverskride": defineOption(true),
      "system-menu.modules.wifi.enableGnomeControlCenter": defineOption(true),
    },
  );
  return config;
})();

export default options;
