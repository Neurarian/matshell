import { Gtk } from "ags/gtk4";
import { Accessor } from "ags";
import { MetricConfig } from "./types";

export function VerticalMetricDisplay({
  icon,
  label,
  detail,
  tooltip,
}: Omit<MetricConfig, "type" | "value">) {
  return (
    <box
      cssClasses={["hw-vertical-display"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
      tooltipText={tooltip}
      valign={Gtk.Align.CENTER}
    >
      <label
        label={label}
        cssClasses={["vertical-display-label"]}
        halign={Gtk.Align.CENTER}
      />
      <label
        label={icon!}
        cssClasses={["vertical-display-icon"]}
        halign={Gtk.Align.CENTER}
      />
      <label
        label={detail}
        cssClasses={["vertical-display-detail"]}
        halign={Gtk.Align.CENTER}
      />
    </box>
  );
}
