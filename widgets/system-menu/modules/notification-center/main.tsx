import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createState, createComputed, onCleanup, createBinding } from "ags";
import { notificationManager } from "utils/notifd";
import { NotificationList } from "./modules/NotificationList.tsx";
import Notifd from "gi://AstalNotifd";

const [isExpanded, setIsExpanded] = createState(false);

export const NotificationBox = () => {
  const notifd = Notifd.get_default();
  const isDndMode = createBinding(notifd, "dont-disturb");

  const {
    limitedActiveNotifications: activeNotifications,
    hasNotifications,
    unreadCount,
  } = notificationManager;

  const notificationIcon = createComputed(
    [activeNotifications, unreadCount, isDndMode],
    (notifications, unread, dndMode) => {
      if (dndMode) {
        return "notifications-disabled-symbolic";
      }

      const count = notifications.length;
      if (count === 0) return "preferences-system-notifications-symbolic";
      if (unread > 0) return "mail-message-new-symbolic";
      return "mail-unread-symbolic";
    },
  );

  const toggleDndMode = () => {
    const currentDnd = notifd.get_dont_disturb();
    notifd.set_dont_disturb(!currentDnd);
  };

  return (
    <box cssClasses={["toggle"]} orientation={Gtk.Orientation.VERTICAL}>
      {/* Notification Toggle Header */}
      <box>
        <button
          cssClasses={hasNotifications((hasNots) =>
            hasNots ? ["button"] : ["button-disabled"],
          )}
          onClicked={toggleDndMode}
          tooltipText={isDndMode((dnd) =>
            dnd ? "Disable Do Not Disturb" : "Enable Do Not Disturb",
          )}
        >
          <image iconName={notificationIcon} />
        </button>

        <button
          hexpand={true}
          onClicked={() => {
            setIsExpanded((prev) => !prev);
            if (!isExpanded.get()) {
              activeNotifications
                .get()
                .forEach((n) => notificationManager.markAsSeen(n.id));
            }
          }}
        >
          <box hexpand={true}>
            <label xalign={0} label="Notifications" />
            <label
              label=" (DND)"
              cssClasses={["dnd-indicator"]}
              visible={isDndMode}
            />
            <label
              label={unreadCount((count) => `: ${count.toString()}`)}
              cssClasses={["unread-badge"]}
              visible={unreadCount((count) => count > 0)}
            />
            <image
              iconName="pan-end-symbolic"
              halign={Gtk.Align.END}
              hexpand
              cssClasses={isExpanded((expanded) =>
                expanded
                  ? ["arrow-indicator", "arrow-down"]
                  : ["arrow-indicator"],
              )}
            />
          </box>
        </button>
      </box>

      {/* Notifications List Revealer */}
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
        revealChild={isExpanded}
        $={() => {
          const windowListener = app.connect("window-toggled", (_, window) => {
            if (
              window.name === "system-menu" &&
              !window.visible &&
              isExpanded.get()
            ) {
              setIsExpanded(false);
            }
          });

          onCleanup(() => {
            app.disconnect(windowListener);
          });
        }}
      >
        <NotificationList />
      </revealer>
    </box>
  );
};

export default NotificationBox;
