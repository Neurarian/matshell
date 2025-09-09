import { Gtk } from "ags/gtk4";
import Adw from "gi://Adw?version=1";
import Pango from "gi://Pango";
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
  variant?: "live" | "stored";
  showDismissButton?: boolean | Accessor<boolean>;
  showTimeAsRelative?: boolean;
  cssClasses?: string[];
  maxWidth?: number;
  maxHeight?: number;
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
  cssClasses = [],
  maxWidth = 300,
}: BaseNotificationProps) {
  const { START, CENTER, END } = Gtk.Align;
  const [isHovered, setIsHovered] = createState(false);
  const timeLabel = createNotificationTimeLabel(notification.time, { variant });

  // Calculate character limits based on pixel constraints
  const maxWidthChars = Math.floor(maxWidth / 8);
  const titleMaxChars = Math.floor(maxWidthChars * 0.5);
  const bodyMaxChars = Math.floor(maxWidthChars);

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
    <Adw.Clamp maximumSize={maxWidth}>
      <box
        orientation={Gtk.Orientation.VERTICAL}
        vexpand={false}
        cssClasses={[...buildCssClasses(), "notification-container"]}
        name={notification.id.toString()}
        overflow={Gtk.Overflow.HIDDEN}
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
            ellipsize={Pango.EllipsizeMode.END}
            singleLineMode={true}
            maxWidthChars={Math.floor(maxWidthChars * 0.5)}
          />
          <label cssClasses={["time"]} hexpand halign={END} label={timeLabel} />
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
        <box cssClasses={["content"]} overflow={Gtk.Overflow.HIDDEN}>
          <box
            cssClasses={["thumb"]}
            visible={Boolean(NotificationIcon(notification))}
            halign={CENTER}
            valign={CENTER}
          >
            {NotificationIcon(notification)}
          </box>

          <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["text-content"]}
            hexpand={true}
            halign={START}
            valign={START}
            overflow={Gtk.Overflow.HIDDEN}
          >
            <label
              cssClasses={["title"]}
              valign={START}
              wrap={true}
              wrapMode={Pango.WrapMode.WORD_CHAR}
              label={notification.summary}
              ellipsize={Pango.EllipsizeMode.END}
              widthChars={titleMaxChars}
              lines={2}
            />
            {notification.body && (
              <label
                cssClasses={["body"]}
                valign={START}
                wrap={true}
                wrapMode={Pango.WrapMode.WORD_CHAR}
                label={notification.body}
                ellipsize={Pango.EllipsizeMode.END}
                widthChars={bodyMaxChars}
                lines={5}
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
                <label
                  label={label}
                  halign={CENTER}
                  hexpand
                  ellipsize={Pango.EllipsizeMode.END}
                />
              </button>
            ))}
          </box>
        )}
      </box>
    </Adw.Clamp>
  );
}
