import { Gtk } from "ags/gtk4";
import { Accessor } from "ags";
import { MetricConfig } from "./types";

export function VerticalMetricBar({
  label,
  value,
  detail,
  tooltip,
}: Omit<MetricConfig, "type" | "icon">) {
  return (
    <box
      cssClasses={["hw-vertical-metric"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
      tooltipText={tooltip}
      valign={Gtk.Align.CENTER}
    >
      <label
        label={label}
        cssClasses={["vertical-metric-label"]}
        halign={Gtk.Align.CENTER}
      />
      <box
        cssClasses={["vertical-metric-bar-container"]}
        halign={Gtk.Align.CENTER}
      >
        <levelbar
          cssClasses={["vertical-metric-bar"]}
          value={value!}
          minValue={0}
          maxValue={1}
          mode={Gtk.LevelBarMode.CONTINUOUS}
          orientation={Gtk.Orientation.VERTICAL}
          inverted={true}
        />
      </box>
      <label
        label={detail}
        cssClasses={["vertical-metric-detail"]}
        halign={Gtk.Align.CENTER}
      />
    </box>
  );
}
