import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createState } from "ags";

export function CategoryButton({
  title,
  icon = null,
  expanded = null,
  onToggle = () => {},
  children,
}) {
  const [logicalVisible, setLogicalVisible] = createState(
    expanded ? expanded.get() : false,
  );

  // Sync with external state if provided
  if (expanded) {
    expanded.subscribe(() => {
      const externalValue = expanded.get();
      if (logicalVisible.get() !== externalValue) {
        setLogicalVisible(externalValue);
      }
    });
  }

  const toggleExpanded = () => {
    const newValue = !logicalVisible.get();
    setLogicalVisible(newValue);
    onToggle();
  };

  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <button onClicked={toggleExpanded} cssClasses={["category-button"]}>
        <box hexpand={true}>
          {icon && <image iconName={icon} />}
          <label label={title} halign={Gtk.Align.START} hexpand={true} />
          <image
            iconName="pan-end-symbolic"
            cssClasses={logicalVisible((e) =>
              e ? ["arrow-indicator", "arrow-down"] : ["arrow-indicator"],
            )}
          />
        </box>
      </button>

      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={300}
        revealChild={logicalVisible}
        onNotifyChildRevealed={(revealer) => {
          const window = app.get_window("control-panel");
          if (window) {
            // Force window to recalculate its size after animation
            if (!revealer.childRevealed) {
               // Use GTK's resize mechanism. Fixes https://github.com/Aylur/astal/issues/258
                window.set_default_size(-1, -1);
            }
          }
        }}
        $={(self) => {
          const windowListener = app.connect("window-toggled", (_, window) => {
            if (
              window.name === "control-panel" &&
              !window.visible &&
              logicalVisible.get()
            ) {
              setLogicalVisible(false);
            }
          });

          (self as any)._cleanup = () => {
            app.disconnect(windowListener);
          };
        }}
      >
        <box
          cssClasses={["category-content"]}
          orientation={Gtk.Orientation.VERTICAL}
        >
          {children}
        </box>
      </revealer>
    </box>
  );
}
