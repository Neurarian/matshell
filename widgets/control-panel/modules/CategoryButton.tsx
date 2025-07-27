import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createState, onCleanup } from "ags";

export function CategoryButton({
  title,
  icon = null,
  expanded = null,
  onToggle = () => {},
  children,
}) {
  const [isExpanded, setIsExpanded] = createState(
    expanded ? expanded.get() : false,
  );

  const toggleExpanded = () => {
    const newValue = !isExpanded.get();
    setIsExpanded(newValue);
    onToggle();
  };

  const windowListener = app.connect("window-toggled", (_, window) => {
    if (
      window.name === "control-panel" &&
      !window.visible &&
      isExpanded.get()
    ) {
      setIsExpanded(false);
    }
  });

  onCleanup(() => {
    app.disconnect(windowListener);
  });

  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <button onClicked={toggleExpanded} cssClasses={["category-button"]}>
        <box hexpand={true}>
          {icon && <image iconName={icon} />}
          <label label={title} halign={Gtk.Align.START} hexpand={true} />
          <image
            iconName="pan-end-symbolic"
            cssClasses={isExpanded((e) =>
              e ? ["arrow-indicator", "arrow-down"] : ["arrow-indicator"],
            )}
          />
        </box>
      </button>

      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={300}
        revealChild={isExpanded}
        onNotifyChildRevealed={(revealer) => {
          const window = app.get_window("control-panel");
          if (window && !revealer.childRevealed) {
            // Use GTK's resize mechanism. Fixes https://github.com/Aylur/astal/issues/258
            window.set_default_size(-1, -1);
          }
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
