import { Astal, Gtk } from "ags/gtk4";
import Notifd from "gi://AstalNotifd";
import Hyprland from "gi://AstalHyprland";
import { createBinding, createComputed, For } from "ags";
import { hyprToGdk } from "utils/hyprland.ts";
import { NotificationWidget } from "./modules/LiveNotification.tsx";

export default function Notifications() {
  const notifd = Notifd.get_default();
  const hyprland = Hyprland.get_default();
  const { TOP, RIGHT } = Astal.WindowAnchor;

  const focusedMonitor = createBinding(hyprland, "focused-monitor");
  const notifications = createBinding(notifd, "notifications");
  const isDndMode = createBinding(notifd, "dont-disturb");

  const shouldShowWindow = createComputed(
    [notifications, isDndMode],
    (notifs, dndEnabled) => {
      // Hide window completely when DND is on or no notifications
      return !dndEnabled && notifs.length > 0;
    }
  );

  return (
    <window
      name="notifications"
      gdkmonitor={focusedMonitor((focused: Hyprland.Monitor) =>
        hyprToGdk(focused),
      )}
      anchor={TOP | RIGHT}
      visible={shouldShowWindow}
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
