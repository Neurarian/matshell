import { App, Gdk, Gtk } from "astal/gtk4";
import { monitorFile } from "astal/file";
import { exec } from "astal/process";
import Hyprland from "gi://AstalHyprland";
import { hyprToGdk } from "utils/hyprland.ts";
import Bar from "./widgets/bar/main.tsx";
import SystemMenu from "./widgets/system-menu/main.tsx";
import OnScreenDisplay from "./widgets/osd/main.tsx";
import Notifications from "./widgets/notifications/main.tsx";
import LogoutMenu from "widgets/logout-menu/main.tsx";
import Applauncher from "./widgets/launcher/main.tsx";
import MusicPlayer from "./widgets/music/main.tsx";

const scss = "./style.scss";
const css = "./style.css";

function reloadCss() {
  console.log("scss change detected");
  exec(`sass ${scss} ${css}`);
  App.apply_css(css);
}

App.start({
  icons: "./assets/icons",
  css: css,
  instanceName: "js",
  requestHandler(request, res) {
    print(request);
    res("ok");
  },
  main() {
    exec(`sass ${scss} ${css}`);
    monitorFile(`./style`, reloadCss);
    const bars = new Map<Gdk.Monitor, Gtk.Widget>();
    const monitorIdMap = new Map();

    Notifications();
    OnScreenDisplay();
    SystemMenu();
    MusicPlayer();
    Applauncher();
    LogoutMenu();

    const hypr = Hyprland.get_default();

    // Initialize
    for (const hyprMonitor of hypr.monitors) {
      const gdkmonitor = hyprToGdk(hyprMonitor);
      if (gdkmonitor) {
        monitorIdMap.set(hyprMonitor.id, gdkmonitor);
        bars.set(gdkmonitor, Bar(gdkmonitor));
        console.log(
          `Initialized bar for Hyprland monitor ID: ${hyprMonitor.id}`,
        );
      }
    }

    hypr.connect("monitor-added", (_, monitor) => {
      const gdkmonitor = hyprToGdk(monitor);
      if (gdkmonitor) {
        bars.set(gdkmonitor, Bar(gdkmonitor));
        monitorIdMap.set(monitor.id, gdkmonitor);
        console.log(`Monitor added - ID: ${monitor.id}`);
      }
    });

    hypr.connect("monitor-removed", (_, id) => {
      const gdkmonitor = monitorIdMap.get(id);
      console.log(
        `Monitor removed - ID: ${id}, GDK monitor found: ${!!gdkmonitor}`,
      );

      if (gdkmonitor) {
        const bar = bars.get(gdkmonitor);

        // Connect to the destroy signal to clean up after it's fully destroyed
        // Works fine but still causes some non-critical assertion failures
        bar.connect("destroy", () => {
          bars.delete(gdkmonitor);
        });

        bar.destroy();
        monitorIdMap.delete(id);
      }
    });
  },
});
