import { onCleanup, onMount } from "ags";
import Notifd from "gi://AstalNotifd";
import { BaseNotification } from "./Notification.tsx";
import { liveToUnified, createTimeoutManager } from "utils/notifd";

export function NotificationWidget({
  notification,
}: {
  notification: Notifd.Notification;
}) {
  const notifd = Notifd.get_default();
  const TIMEOUT_DELAY = 3000;

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
          if (notification.actions && notification.actions.length > 0) {
            const actionId =
              notification.actions[0].id || notification.actions[0].action;
            notification.invoke(actionId);
          }
          break;
        case 2: // MIDDLE
          notifd.notifications?.forEach((n) => n.dismiss());
          break;
        case 3: // SECONDARY/RIGHT
          notification.dismiss();
          break;
      }
    } catch (error) {
      console.error("Error handling live notification click:", error);
    }
  };

  return (
    <BaseNotification
      notification={liveToUnified(notification)}
      variant="live"
      onClick={handleClick}
      onHover={() => timeoutManager.handleHover()}
      onHoverLost={() => timeoutManager.handleHoverLost()}
      cssClasses={["notification"]}
      maxWidth={285}
    />
  );
}
