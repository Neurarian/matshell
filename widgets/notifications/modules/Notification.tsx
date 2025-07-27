import { Gtk } from "ags/gtk4";
import { createBinding, onCleanup, onMount } from "ags";
import Notifd from "gi://AstalNotifd";
import { NotificationIcon } from "./Icon.tsx";
import { time, urgency, createTimeoutManager } from "utils/notifd.ts";

export function NotificationWidget({
  notification,
}: {
  notification: Notifd.Notification;
}) {
  const { START, CENTER, END } = Gtk.Align;
  const actions = notification.actions || [];
  const TIMEOUT_DELAY = 3000;
  const notifd = Notifd.get_default();

  const timeoutManager = createTimeoutManager(
    () => notification.dismiss(),
    TIMEOUT_DELAY,
  );

  onMount(() => {
    timeoutManager.setupTimeout();
  });

  onCleanup(() => {
    timeoutManager.cleanup();
  });

  const handleClick = (button: number) => {
    try {
      switch (button) {
        case 1: // PRIMARY/LEFT
          actions.length > 0 && notification.invoke(actions[0]);
          break;
        case 2: // MIDDLE
          notifd.notifications?.forEach((n) => n.dismiss());
          break;
        case 3: // SECONDARY/RIGHT
          notification.dismiss();
          break;
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      vexpand={false}
      cssClasses={["notification", `${urgency(notification)}`]}
      name={notification.id.toString()}
    >
      <Gtk.GestureClick
        button={0} // Any button
        onPressed={(gesture) => {
          const button = gesture.get_current_button();
          handleClick(button);
        }}
      />

      <Gtk.EventControllerMotion
        onEnter={() => timeoutManager.handleHover()}
        onLeave={() => timeoutManager.handleHoverLost()}
      />

      <box cssClasses={["header"]}>
        <label
          cssClasses={["app-name"]}
          halign={CENTER}
          label={createBinding(notification, "app_name")}
        />
        <label
          cssClasses={["time"]}
          hexpand
          halign={END}
          label={time(notification.time)}
        />
      </box>

      <Gtk.Separator />

      <box cssClasses={["content"]}>
        <box
          cssClasses={["thumb"]}
          visible={Boolean(NotificationIcon(notification))}
          halign={CENTER}
          valign={CENTER}
          vexpand={true}
        >
          {NotificationIcon(notification)}
        </box>

        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["text-content"]}
          hexpand={true}
          halign={CENTER}
          valign={CENTER}
        >
          <label
            cssClasses={["title"]}
            valign={CENTER}
            wrap={false}
            label={createBinding(notification, "summary")}
          />
          {notification.body && (
            <label
              cssClasses={["body"]}
              valign={CENTER}
              wrap={true}
              maxWidthChars={50}
              label={createBinding(notification, "body")}
            />
          )}
        </box>
      </box>

      {actions.length > 0 && (
        <box cssClasses={["actions"]}>
          {actions.map(({ label, action }) => (
            <button
              hexpand
              cssClasses={["action-button"]}
              onClicked={() => notification.invoke(action)}
            >
              <label label={label} halign={CENTER} hexpand />
            </button>
          ))}
        </box>
      )}
    </box>
  );
}
