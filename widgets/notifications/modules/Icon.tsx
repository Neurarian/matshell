import { Gtk } from "ags/gtk4";
import Notifd from "gi://AstalNotifd";
import { fileExists, isIcon } from "utils/notifd.ts";

export function NotificationIcon(notification: Notifd.Notification) {
  const icon =
    notification.image || notification.appIcon || notification.desktopEntry;
  if (!icon) return null;
  if (fileExists(icon))
    return (
      <box expand={false} valign={Gtk.Align.CENTER}>
        <image file={icon} />
      </box>
    );
  else if (isIcon(icon))
    return (
      <box expand={false} valign={Gtk.Align.CENTER}>
        <image iconName={icon} />
      </box>
    );
}
