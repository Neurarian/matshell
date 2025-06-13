import { App } from "astal/gtk4";
import { exec, monitorFile, GLib } from "astal";
import Hyprland from "gi://AstalHyprland";
import { hyprToGdk } from "utils/hyprland.ts";
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
  App.apply_css(css);
}

App.start({
  icons: icons,
  css: css,
  instanceName: "js",
  requestHandler(request, res) {
    print(request);
    res("ok");
  },
  main() {
    exec(`sass ${scss} ${css}`);
    styleDirectories.forEach((dir) =>
      monitorFile(`${GLib.get_user_config_dir()}/ags/style/${dir}`, reloadCss),
    );

    const barNames = new Map<number, string>(); // Map Hyprland ID to window name

    Notifications();
    OnScreenDisplay();
    SystemMenu();
    MusicPlayer();
    Applauncher();
    LogoutMenu();
    ControlPanel();

    const hypr = Hyprland.get_default();

    // Initialize
    for (const hyprMonitor of hypr.monitors) {
      const gdkmonitor = hyprToGdk(hyprMonitor);
      if (gdkmonitor) {
        const windowName = Bar(gdkmonitor);
        barNames.set(hyprMonitor.id, windowName);
      }
    }

    hypr.connect("monitor-added", (_, monitor) => {
      const gdkmonitor = hyprToGdk(monitor);
      if (gdkmonitor) {
        const windowName = Bar(gdkmonitor);
        barNames.set(monitor.id, windowName);
        console.log(`Monitor added - ID: ${monitor.id}`);
      }
    });

    hypr.connect("monitor-removed", (_, id) => {
      console.log(`Monitor removed - ID: ${id}`);
      const windowName = barNames.get(id);
      if (windowName) {
        const window = App.get_window(windowName);
        if (window) {
          console.log(`Removing bar: ${windowName}`);
          App.toggle_window(windowName);
          window.set_child(null);
          App.remove_window(window);
        }
        barNames.delete(id);
      }
    });
  },
  requestHandler(request: string, res: (response: any) => void) {
    if (request === "launcher") {
      App.toggle_window("launcher");
      res("app launcher toggled");
    } else if (request === "logout") {
      App.toggle_window("logout-menu");
      res("logout menu toggled");
    } else {
      res("not found");
    }
  },
});
