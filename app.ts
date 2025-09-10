import app from "ags/gtk4/app";
import { exec } from "ags/process";
import { monitorFile } from "ags/file";
import GLib from "gi://GLib?version=2.0";

// Widgets
import {
  Bar,
  SystemMenu,
  OnScreenDisplay,
  Notifications,
  LogoutMenu,
  Applauncher,
  MusicPlayer,
  ControlPanel,
  Sidebar,
} from "./widgets";

// Style paths
const scss = `${GLib.get_user_config_dir()}/ags/style/main.scss`;
const css = `${GLib.get_user_config_dir()}/ags/style/main.css`;
const icons = `${GLib.get_user_config_dir()}/ags/assets/icons`;
const styleDirectories = ["abstracts", "components", "layouts", "base"];

function reloadCss() {
  console.log("scss change detected");
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

    // Initialize widgets
    Bar();
    Notifications();
    OnScreenDisplay();
    SystemMenu();
    MusicPlayer();
    Applauncher();
    LogoutMenu();
    ControlPanel();
    Sidebar();
  },
});
