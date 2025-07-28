import {
  createState,
  createComputed,
  onCleanup,
  Accessor,
  createRoot,
} from "ags";
import Notifd from "gi://AstalNotifd";
import GLib from "gi://GLib?version=2.0";
import type { StoredNotification } from "./types.ts";

export class NotificationManager {
  private notifications = new Map<number, StoredNotification>();
  private notificationState: Accessor<StoredNotification[]>;
  private setNotificationState: (
    value:
      | StoredNotification[]
      | ((prev: StoredNotification[]) => StoredNotification[]),
  ) => void;
  private notifd = Notifd.get_default();
  private maxVisibleNotifications = 5;

  constructor() {
    const [notificationState, setNotificationState] = createState<
      StoredNotification[]
    >([]);
    this.notificationState = notificationState;
    this.setNotificationState = setNotificationState;

    this.loadPersistedNotifications();
    this.setupNotificationListeners();
  }

  dismissNotification(id: number): void {
    const notification = this.notifications.get(id);
    if (notification) {
      console.log(`Deleting notification: ${notification.summary}`);
      this.notifications.delete(id);
      this.updateState();
      this.persistNotifications();
    }
  }

  markAsSeen(id: number): void {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.seen = true;
      this.updateState();
      this.persistNotifications();
    }
  }

  setMaxVisibleNotifications(limit: number) {
    this.maxVisibleNotifications = limit;
    this.updateState();
  }

  clearVisibleNotifications() {
    const visibleNotifications = this.limitedActiveNotifications.get();
    visibleNotifications.forEach((notification) => {
      this.notifications.delete(notification.id);
    });
    this.updateState();
    this.persistNotifications();
  }

  clearAllNotifications() {
    this.notifications.clear();
    this.updateState();
    this.persistNotifications();
  }

  get activeNotifications() {
    return this.notificationState;
  }

  get limitedActiveNotifications() {
    return this.activeNotifications((notifications) =>
      notifications.slice(0, this.maxVisibleNotifications),
    );
  }

  get newNotifications() {
    return this.limitedActiveNotifications((notifications) =>
      notifications.filter((n) => !n.seen),
    );
  }

  get readNotifications() {
    return this.limitedActiveNotifications((notifications) =>
      notifications.filter((n) => n.seen),
    );
  }

  get unreadCount() {
    return this.activeNotifications(
      (notifications) => notifications.filter((n) => !n.seen).length,
    );
  }

  get hasNotifications() {
    return this.limitedActiveNotifications(
      (notifications) => notifications.length > 0,
    );
  }

  get hasNewNotifications() {
    return this.newNotifications((notifications) => notifications.length > 0);
  }

  get hasReadNotifications() {
    return this.readNotifications((notifications) => notifications.length > 0);
  }

  get moreNotificationsInfo() {
    return createComputed(
      [this.notificationState, this.limitedActiveNotifications],
      (allActive, limited) => {
        const totalCount = allActive.length;
        const shownCount = limited.length;
        return {
          hasMore: totalCount > shownCount,
          moreCount: totalCount - shownCount,
        };
      },
    );
  }

  private setupNotificationListeners(): void {
    const addedId = this.notifd.connect("notified", (_, notificationId) => {
      console.log("Received notification ID:", notificationId);

      const notification = this.notifd.get_notification(notificationId);
      if (notification) {
        this.storeNotification(notification);
      } else {
        console.error(
          "Could not retrieve notification with ID:",
          notificationId,
        );
      }
    });

    onCleanup(() => {
      this.notifd.disconnect(addedId);
    });
  }

  private updateState(): void {
    const sortedNotifications = Array.from(this.notifications.values()).sort(
      (a, b) => b.time - a.time,
    );
    this.setNotificationState(sortedNotifications);
  }

  private persistNotifications(): void {
    try {
      const data = JSON.stringify(Array.from(this.notifications.entries()));
      const cacheDir = `${GLib.get_user_cache_dir()}/ags`;

      if (!GLib.file_test(cacheDir, GLib.FileTest.EXISTS)) {
        GLib.mkdir_with_parents(cacheDir, 0o755);
      }

      GLib.file_set_contents(`${cacheDir}/notifications.json`, data);
    } catch (error) {
      console.error("Failed to persist notifications:", error);
    }
  }

  private loadPersistedNotifications(): void {
    try {
      const cacheFile = `${GLib.get_user_cache_dir()}/ags/notifications.json`;

      if (GLib.file_test(cacheFile, GLib.FileTest.EXISTS)) {
        const [success, contents] = GLib.file_get_contents(cacheFile);
        if (success) {
          const data = JSON.parse(new TextDecoder().decode(contents));
          this.notifications = new Map(data);
          this.updateState();
        }
      }
    } catch (error) {
      console.error("Failed to load persisted notifications:", error);
    }
  }

  private storeNotification(notification: Notifd.Notification): void {
    const stored: StoredNotification = {
      id: notification.id,
      appName: notification.appName || "Unknown",
      summary: notification.summary || "",
      body: notification.body,
      appIcon: notification.appIcon,
      image: notification.image,
      desktopEntry: notification.desktopEntry,
      time: notification.time * 1000,
      actions: notification.actions || [],
      urgency: notification.urgency || Notifd.Urgency.NORMAL,
      seen: false,
    };

    this.notifications.set(notification.id, stored);
    this.updateState();
    this.persistNotifications();
  }
}

export const notificationManager = createRoot(() => {
  const manager = new NotificationManager();
  return manager;
});
