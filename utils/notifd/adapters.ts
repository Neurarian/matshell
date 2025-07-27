import Notifd from "gi://AstalNotifd";
import type { UnifiedNotification, StoredNotification } from "./types.ts";

export function liveToUnified(
  notification: Notifd.Notification,
): UnifiedNotification {
  return {
    id: notification.id,
    appName: notification.appName || "Unknown",
    summary: notification.summary || "",
    body: notification.body,
    appIcon: notification.appIcon,
    image: notification.image,
    desktopEntry: notification.desktopEntry,
    time: notification.time,
    urgency: notification.urgency || Notifd.Urgency.NORMAL,
    actions: notification.actions || [],
  };
}

export function storedToUnified(
  notification: StoredNotification,
): UnifiedNotification {
  return {
    id: notification.id,
    appName: notification.appName,
    summary: notification.summary,
    body: notification.body,
    appIcon: notification.appIcon,
    image: notification.image,
    desktopEntry: notification.desktopEntry,
    time: notification.time,
    actions: notification.actions,
    urgency: notification.urgency || Notifd.Urgency.NORMAL,
    dismissed: notification.dismissed,
    seen: notification.seen,
  };
}
