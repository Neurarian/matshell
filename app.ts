import app from "ags/gtk4/app";
import { exec } from "ags/process";
import { monitorFile } from "ags/file";
import GLib from "gi://GLib?version=2.0";

// ──────────────────────────────
// 🔧 System Setup
// ──────────────────────────────

const scss = `${GLib.get_user_config_dir()}/ags/style/main.scss`;
const css = `${GLib.get_user_config_dir()}/ags/style/main.css`;
const icons = `${GLib.get_user_config_dir()}/ags/assets/icons`;

const styleDirectories = ["abstracts", "components", "layouts", "base"];

function reloadCss() {
  console.log("scss change detected");
  exec(`sass ${scss} ${css}`);
  app.apply_css(css);
}

// ──────────────────────────────
// 🪟 Widgets
// ──────────────────────────────

import Bar from "./widgets/bar/main.tsx";
import SystemMenu from "./widgets/system-menu/main.tsx";
import OnScreenDisplay from "./widgets/osd/main.tsx";
import Notifications from "./widgets/notifications/main.tsx";
import LogoutMenu from "./widgets/logout-menu/main.tsx";
import Applauncher from "./widgets/launcher/main.tsx";
import MusicPlayer from "./widgets/music/main.tsx";
import ControlPanel from "./widgets/control-panel/main.tsx";
import Sidebar from "./widgets/sidebar/main.tsx";

// ──────────────────────────────
// 🚀 App Start
// ──────────────────────────────

app.start({
  icons,
  css,
  instanceName: "matshell",

  // Handle external toggle requests
  requestHandler(argv: string[], res: (response: any) => void) {
    const request = argv[0];
    switch (request) {
      case "launcher":
        app.toggle_window("launcher");
        res("app launcher toggled");
        break;
      case "logout":
        app.toggle_window("logout-menu");
        res("logout menu toggled");
        break;
      case "sidebar":
        app.toggle_window("sidebar");
        res("sidebar toggled");
        break;
      default:
        res("not found");
    }
  },

  main() {
    // Compile & watch SCSS
    exec(`sass ${scss} ${css}`);
    styleDirectories.forEach((dir) =>
      monitorFile(`${GLib.get_user_config_dir()}/ags/style/${dir}`, reloadCss),
    );

    // Register all widgets
    Bar();
    Notifications();
    OnScreenDisplay();
    SystemMenu();
    MusicPlayer();
    Applauncher();
    LogoutMenu();
    ControlPanel();
    Sidebar(); // ← our new sidebar
  },
});
