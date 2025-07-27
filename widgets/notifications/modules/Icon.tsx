import { Gtk } from "ags/gtk4";
import Notifd from "gi://AstalNotifd";
import { fileExists, isIcon } from "utils/notifd";

export function NotificationIcon(notification: Notifd.Notification) {
  const icon =
    notification.image || notification.appIcon || notification.desktopEntry;
  if (!icon) return null;
  if (fileExists(icon))
    return (
      <box  valign={Gtk.Align.CENTER}>
        <image file={icon} />
      </box>
    );
  else if (isIcon(icon))
    return (
      <box  valign={Gtk.Align.CENTER}>
        <image iconName={icon} />
      </box>
    );
}
