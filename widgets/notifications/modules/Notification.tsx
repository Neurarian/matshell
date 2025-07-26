import { Gtk } from "ags/gtk4";
import { createBinding } from "ags";
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

  // Keep track of notification validity
  const notifd = Notifd.get_default();
  const timeoutManager = createTimeoutManager(
    () => notification.dismiss(),
    TIMEOUT_DELAY,
  );

  return (
    <box
      $={(self) => {
        // Set up timeout
        timeoutManager.setupTimeout();

        // Create click gesture controller
        const clickGesture = Gtk.GestureClick.new();
        clickGesture.set_button(0); // 0 means any button
        clickGesture.connect("pressed", (gesture, _) => {
          try {
            // Get which button was pressed (1=left, 2=middle, 3=right)
            const button = gesture.get_current_button();

            switch (button) {
              case 1: // PRIMARY/LEFT
                actions.length > 0 && notification.invoke(actions[0]);
                break;
              case 2: // MIDDLE
                notifd.notifications?.forEach((n) => {
                  n.dismiss();
                });
                break;
              case 3: // SECONDARY/RIGHT
                notification.dismiss();
                break;
            }
          } catch (error) {
            console.error(error);
          }
        });
        self.add_controller(clickGesture);

        const motionController = new Gtk.EventControllerMotion();

        motionController.connect("enter", () => {
          timeoutManager.handleHover();
        });

        motionController.connect("leave", () => {
          timeoutManager.handleHoverLost();
        });

        self.add_controller(motionController);

        // Cleanup on unrealize
        self.connect("unrealize", () => {
          timeoutManager.cleanup();
        });
      }}
      orientation={Gtk.Orientation.VERTICAL}
      vexpand={false}
      cssClasses={["notification", `${urgency(notification)}`]}
      name={notification.id.toString()}
    >
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
