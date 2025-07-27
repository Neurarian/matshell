import { onCleanup, onMount } from "ags";
import Notifd from "gi://AstalNotifd";
import { BaseNotification } from "./Notification.tsx";
import { liveToUnified, createTimeoutManager } from "utils/notifd";

export function NotificationWidget({
  notification,
}: {
  notification: Notifd.Notification;
}) {
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
            notification.invoke(notification.actions[0]);
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
      maxBodyChars={50}
      maxSummaryChars={24}
      cssClasses={["notification"]}
    />
  );
}
