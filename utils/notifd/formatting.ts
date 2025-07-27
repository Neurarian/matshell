import { createPoll } from "ags/time";
import GLib from "gi://GLib?version=2.0";
import type { UnifiedNotification } from "./types.ts";
import Notifd from "gi://AstalNotifd";

export const currentTime = createPoll(Date.now(), 60000, () => Date.now());

export const formatTimestamp = (timestamp: number, format = "%H:%M") =>
  GLib.DateTime.new_from_unix_local(timestamp).format(format)!;

export function createNotificationTimeLabel(
  notificationTimestamp: number,
  options: {
    variant?: "live" | "stored";
    format?: string;
    updateInterval?: number;
  } = {},
) {
  const { variant = "live", format = "%H:%M" } = options;
  const shouldShowRelative = variant === "stored";

  if (shouldShowRelative) {
    return currentTime((now) => {
      const diff = now - notificationTimestamp;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return "Just now";
    });
  } else {
    return currentTime(() => formatTimestamp(notificationTimestamp, format));
  }
}

export const urgency = (notification: UnifiedNotification) => {
  const { LOW, NORMAL, CRITICAL } = Notifd.Urgency;

  switch (notification.urgency) {
    case LOW:
      return "low";
    case CRITICAL:
      return "critical";
    case NORMAL:
    default:
      return "normal";
  }
};
