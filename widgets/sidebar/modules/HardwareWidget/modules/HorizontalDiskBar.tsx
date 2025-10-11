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
  // Truncate mount point if it's too long
  const truncatePath = (path: string, maxLength: number = 20): string => {
    if (path.length <= maxLength) return path;
    
    // For paths like /home/user/something, show /home/.../something
    const parts = path.split('/').filter(p => p);
    if (parts.length > 2) {
      return `/${parts[0]}/.../${parts[parts.length - 1]}`;
    }
    
    // Otherwise just truncate with ellipsis
    return path.substring(0, maxLength - 3) + '...';
  };

  return (
    <box
      cssClasses={["hw-disk-bar"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={4}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <label
          label={truncatePath(mountPoint)}
          cssClasses={["disk-bar-mount"]}
          halign={Gtk.Align.START}
          hexpand
          tooltipText={mountPoint}
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