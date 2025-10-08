import { Gtk } from "ags/gtk4";
import { Accessor } from "ags";

export function HorizontalDiskBar({
  mountPoint,
  utilization,
  used,
  total,
}: {
  mountPoint: string;
  utilization: number;
  used: string;
  total: string;
}) {
  return (
    <box
      cssClasses={["hw-disk-bar"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={4}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <label
          label={mountPoint}
          cssClasses={["disk-bar-mount"]}
          halign={Gtk.Align.START}
          hexpand
        />
        <label
          label={`${used} / ${total}`}
          cssClasses={["disk-bar-detail"]}
          halign={Gtk.Align.END}
        />
      </box>
      <levelbar
        cssClasses={["disk-bar-level"]}
        value={utilization}
        minValue={0}
        maxValue={1}
        mode={Gtk.LevelBarMode.CONTINUOUS}
      />
    </box>
  );
}

