// Types
export type {
  UnifiedNotification,
  StoredNotification,
  TimeoutManager,
} from "./types.ts";

// Manager and singleton
export { NotificationManager, notificationManager } from "./manager.ts";

// Utilities
export { createTimeoutManager } from "./timeout.ts";
export {
  currentTime,
  formatTimestamp,
  createNotificationTimeLabel,
  urgency,
} from "./formatting.ts";
export { isIcon, fileExists } from "./validation.ts";
export { liveToUnified, storedToUnified } from "./adapters.ts";
