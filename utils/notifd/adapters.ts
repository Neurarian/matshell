import Notifd from "gi://AstalNotifd";
import type { UnifiedNotification, StoredNotification } from "./types.ts";

export function liveToUnified(
  notification: Notifd.Notification,
): UnifiedNotification {
  // Convert GJS actions to the expected format
  const convertedActions = (notification.actions || []).map((action) => {
    return {
      label: action.label || action.name || action.text || String(action),
      action: action.id || action.key || action.action || String(action),
    };
  });
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
    actions: convertedActions,
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
    seen: notification.seen,
  };
}
