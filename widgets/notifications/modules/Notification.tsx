import { Gtk } from "ags/gtk4";
import { createState, Accessor } from "ags";
import { NotificationIcon } from "./Icon.tsx";
import {
  urgency,
  UnifiedNotification,
  createNotificationTimeLabel,
} from "utils/notifd";

export interface BaseNotificationProps {
  notification: UnifiedNotification;
  onAction?: (id: number, action: string) => void;
  onDismiss?: (id: number) => void;
  onClick?: (button: number, notification: UnifiedNotification) => void;
  onHover?: () => void;
  onHoverLost?: () => void;

  // Configuration options for different use cases
  variant?: "live" | "stored";
  showDismissButton?: boolean | Accessor<boolean>;
  showTimeAsRelative?: boolean;
  maxBodyChars?: number;
  maxSummaryChars?: number;
  cssClasses?: string[];
}

export function BaseNotification({
  notification,
  onAction,
  onDismiss,
  onClick,
  onHover,
  onHoverLost,
  variant = "live",
  showDismissButton = false,
  maxBodyChars = 50,
  maxSummaryChars = 40,
  cssClasses = [],
}: BaseNotificationProps) {
  const { START, CENTER, END } = Gtk.Align;
  const [isHovered, setIsHovered] = createState(false);

  const timeLabel = createNotificationTimeLabel(notification.time, { variant });

  // Default click handling
  const handleClick = (button: number) => {
    if (onClick) {
      onClick(button, notification);
    } else {
      try {
        switch (button) {
          case 1: // PRIMARY/LEFT
            if (notification.actions.length > 0 && onAction) {
              onAction(notification.id, notification.actions[0].action);
            }
            break;
          case 3: // SECONDARY/RIGHT
            if (onDismiss) {
              onDismiss(notification.id);
            }
            break;
        }
      } catch (error) {
        console.error("Error handling notification click:", error);
      }
    }
  };

  const handleHover = () => {
    setIsHovered(true);
    if (onHover) onHover();
  };

  const handleHoverLost = () => {
    setIsHovered(false);
    if (onHoverLost) onHoverLost();
  };

  const buildCssClasses = (): string[] => {
    const classes = [
      "base-notification",
      `notification-${variant}`,
      `${urgency(notification)}`,
      ...cssClasses,
    ];

    // Could be useful at some point
    if (variant === "stored") {
      if (notification.seen) classes.push("notification-seen");
      else classes.push("notification-unseen");
      if (notification.dismissed) classes.push("notification-dismissed");
    }

    return classes;
  };

  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      vexpand={false}
      cssClasses={buildCssClasses()}
      name={notification.id.toString()}
    >
      <Gtk.GestureClick
        button={0}
        onPressed={(gesture) => {
          const button = gesture.get_current_button();
          handleClick(button);
        }}
      />

      <Gtk.EventControllerMotion
        onEnter={handleHover}
        onLeave={handleHoverLost}
      />

      {/* Header */}
      <box cssClasses={["header"]}>
        <label
          cssClasses={["app-name"]}
          halign={variant === "stored" ? START : CENTER}
          label={notification.appName}
        />
        <label cssClasses={["time"]} hexpand halign={END} label={timeLabel} />

        {/* Conditional dismiss button */}
        {(typeof showDismissButton === "boolean"
          ? showDismissButton
          : showDismissButton.get()) && (
          <button
            cssClasses={["dismiss-button"]}
            visible={variant === "stored" ? isHovered : true}
            onClicked={() => onDismiss?.(notification.id)}
            tooltipText="Dismiss notification"
          >
            <image iconName="window-close-symbolic" pixelSize={12} />
          </button>
        )}
      </box>

      <Gtk.Separator cssClasses={["notification-separator"]} />

      {/* Content */}
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
            wrap={true}
            label={notification.summary}
            maxWidthChars={maxSummaryChars}
          />
          {notification.body && (
            <label
              cssClasses={["body"]}
              valign={CENTER}
              wrap={true}
              maxWidthChars={maxBodyChars}
              label={notification.body}
            />
          )}
        </box>
      </box>

      {/* Actions */}
      {notification.actions.length > 0 && (
        <box cssClasses={["actions"]}>
          {notification.actions.map(({ label, action }) => (
            <button
              hexpand
              cssClasses={["action-button"]}
              onClicked={() => onAction?.(notification.id, action)}
            >
              <label label={label} halign={CENTER} hexpand />
            </button>
          ))}
        </box>
      )}
    </box>
  );
}
