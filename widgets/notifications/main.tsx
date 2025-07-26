import { Astal, Gtk } from "ags/gtk4";
import Notifd from "gi://AstalNotifd";
import Hyprland from "gi://AstalHyprland";
import { createBinding, For } from "ags";
import { hyprToGdk } from "utils/hyprland.ts";
import { NotificationWidget } from "./modules/Notification.tsx";

export default function Notifications() {
  const notifd = Notifd.get_default();
  const hyprland = Hyprland.get_default();
  const { TOP, RIGHT } = Astal.WindowAnchor;

  // Create bindings for the accessors
  const focusedMonitor = createBinding(hyprland, "focused-monitor");
  const notifications = createBinding(notifd, "notifications");

  return (
    <window
      name="notifications"
      gdkmonitor={focusedMonitor((focused: Hyprland.Monitor) =>
        hyprToGdk(focused),
      )}
      anchor={TOP | RIGHT}
      visible={notifications((notifs) => notifs.length > 0)}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["notifications"]}
      >
        <For each={notifications}>
          {(notification) => <NotificationWidget notification={notification} />}
        </For>
      </box>
    </window>
  );
}
