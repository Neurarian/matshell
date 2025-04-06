import { Astal } from "astal/gtk4";
import Notifd from "gi://AstalNotifd";
import { bind } from "astal";
import { focusedGdkMonitor } from "utils/hyprland.ts";
import { NotificationWidget } from "./modules/Notification.tsx";

export default function Notifications() {
  const notifd = Notifd.get_default();
  const { TOP, RIGHT } = Astal.WindowAnchor;

  return (
    <window
      visible={bind(notifd, "notifications").as((n) => n.length > 0)}
      name="notifications"
      gdkmonitor={focusedGdkMonitor}
      anchor={TOP | RIGHT}
      child={
        <box vertical={true} cssClasses={["notifications"]}>
          {bind(notifd, "notifications").as((notifications) =>
            notifications.map((n) => (
              <NotificationWidget notification={n} />
            )),
          )}
        </box>
      }
    />
  );
}
