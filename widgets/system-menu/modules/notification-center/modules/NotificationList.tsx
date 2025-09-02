import { Gtk } from "ags/gtk4";
import { createState, For } from "ags";
import { notificationManager, storedToUnified } from "utils/notifd";
import { BaseNotification } from "widgets/notifications/modules/Notification.tsx";

export const NotificationList = () => {
  const [_hoveredId, setHoveredId] = createState<number | null>(null);

  const {
    newNotifications,
    readNotifications,
    hasNotifications,
    hasNewNotifications,
    hasReadNotifications,
    moreNotificationsInfo,
  } = notificationManager;

  return (
    <box
      marginTop={4}
      orientation={Gtk.Orientation.VERTICAL}
      cssClasses={["system-menu-list"]}
    >
      {/* Empty state */}
      <box visible={hasNotifications((has) => !has)}>
        <label
          label="No notifications"
          cssClasses={["empty-label"]}
          halign={Gtk.Align.CENTER}
          hexpand
        />
      </box>

      {/* New Notifications Section */}
      <box orientation={Gtk.Orientation.VERTICAL} visible={hasNewNotifications}>
        <label label="New Notifications" cssClasses={["section-label"]} />
        <box orientation={Gtk.Orientation.VERTICAL}>
          <For each={newNotifications}>
            {(notification) => (
              <BaseNotification
                notification={storedToUnified(notification)}
                variant="stored"
                onAction={(id, action) => {
                  notificationManager.dismissNotification(id);
                }}
                onDismiss={(id) => {
                  notificationManager.dismissNotification(id);
                }}
                showDismissButton={true}
                onHover={() => setHoveredId(notification.id)}
                onHoverLost={() => setHoveredId(null)}
                maxBodyChars={25}
                maxSummaryChars={20}
                cssClasses={["notification"]}
              />
            )}
          </For>
        </box>
      </box>

      {/* Read Notifications Section */}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        visible={hasReadNotifications}
      >
        <label label="Earlier Notifications" cssClasses={["section-label"]} />
        <box orientation={Gtk.Orientation.VERTICAL}>
          <For each={readNotifications}>
            {(notification) => (
              <BaseNotification
                notification={storedToUnified(notification)}
                variant="stored"
                onAction={(id, action) => {
                  notificationManager.dismissNotification(id);
                }}
                onDismiss={(id) => {
                  notificationManager.dismissNotification(id);
                }}
                showDismissButton={true}
                onHover={() => setHoveredId(notification.id)}
                onHoverLost={() => setHoveredId(null)}
                maxBodyChars={25}
                maxSummaryChars={20}
                cssClasses={["notification", "notification-read"]}
              />
            )}
          </For>
        </box>
      </box>

      {/* More notifications indicator */}
      <box
        cssClasses={["more-notifications"]}
        marginTop={4}
        visible={moreNotificationsInfo((info) => info.hasMore)}
      >
        <label
          label={moreNotificationsInfo(
            (info) => `${info.moreCount} more notifications...`,
          )}
          cssClasses={["more-text"]}
          halign={Gtk.Align.CENTER}
          hexpand={true}
        />
      </box>

      {/* Control buttons */}
      <box hexpand visible={hasNotifications} marginTop={8}>
        <button
          halign={Gtk.Align.START}
          cssClasses={["clear-all-button"]}
          onClicked={() => {
            notificationManager.clearAllNotifications();
          }}
          tooltipText="Clear all notifications"
        >
          <image iconName="edit-clear-all-symbolic" />
        </button>

        <box hexpand />

        <button
          cssClasses={["mark-read-button"]}
          halign={Gtk.Align.END}
          hexpand={false}
          visible={hasNewNotifications}
          onClicked={() => {
            newNotifications
              .get()
              .forEach((n) => notificationManager.markAsSeen(n.id));
          }}
          tooltipText="Mark all as read"
        >
          <image iconName="object-select-symbolic" />
        </button>
      </box>
    </box>
  );
};
