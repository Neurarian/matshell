import app from "ags/gtk4/app";
import { exec } from "ags/process";
import { monitorFile } from "ags/file";
import GLib from "gi://GLib?version=2.0";
import Bar from "./widgets/bar/main.tsx";
import SystemMenu from "./widgets/system-menu/main.tsx";
import OnScreenDisplay from "./widgets/osd/main.tsx";
import Notifications from "./widgets/notifications/main.tsx";
import LogoutMenu from "widgets/logout-menu/main.tsx";
import Applauncher from "./widgets/launcher/main.tsx";
import MusicPlayer from "./widgets/music/main.tsx";
import ControlPanel from "./widgets/control-panel/main.tsx";

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
  icons: icons,
  css: css,
  instanceName: "matshell",
  requestHandler(request: string, res: (response: any) => void) {
    if (request === "launcher") {
      app.toggle_window("launcher");
      res("app launcher toggled");
    } else if (request === "logout") {
      app.toggle_window("logout-menu");
      res("logout menu toggled");
    } else {
      res("not found");
    }
  },
  main() {
    exec(`sass ${scss} ${css}`);
    styleDirectories.forEach((dir) =>
      monitorFile(`${GLib.get_user_config_dir()}/ags/style/${dir}`, reloadCss),
    );

    Bar();
    Notifications();
    OnScreenDisplay();
    SystemMenu();
    MusicPlayer();
    Applauncher();
    LogoutMenu();
    ControlPanel();
  },
});
