import app from "ags/gtk4/app";
import { exec } from "ags/process";
import { monitorFile } from "ags/file";
import GLib from "gi://GLib?version=2.0";
import { picker } from "utils/picker";

// Widgets
import {
  Bar,
  SystemMenu,
  OnScreenDisplay,
  Notifications,
  LogoutMenu,
  PickerWindow,
  MusicPlayer,
  Sidebar,
} from "./widgets";

// Style paths
const scss = `${GLib.get_user_config_dir()}/ags/style/main.scss`;
const css = `${GLib.get_user_config_dir()}/ags/style/main.css`;
const icons = `${GLib.get_user_config_dir()}/ags/assets/icons`;
const styleDirectories = ["abstracts", "components", "layouts", "base"];

function reloadCss() {
  console.log("scss change detected - recompiling...");
  exec(`sass ${scss} ${css}`);
  app.apply_css(css);
}

app.start({
  icons,
  css,
  instanceName: "matshell",
  requestHandler(argv: string[], res: (response: any) => void) {
    const request = argv[0];
    switch (request) {
      case "picker":
        app.toggle_window("picker");
        res("picker toggled");
        break;
      case "logout":
        app.toggle_window("logout-menu");
        res("logout menu toggled");
        break;
      case "sidebar":
        app.toggle_window("sidebar");
        res("sidebar toggled");
        break;
      case "reload-css":
        reloadCss();
        res("css reloaded");
        break;
      case "wall-rand":
        picker.random("wp");
        res("random wallpaper set");
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

    // Initialize widgets
    Bar();
    Notifications();
    OnScreenDisplay();
    SystemMenu();
    MusicPlayer();
    PickerWindow();
    LogoutMenu();
    Sidebar();
  },
});
