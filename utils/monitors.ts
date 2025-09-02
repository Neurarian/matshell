import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { createBinding } from "ags";
import Hyprland from "gi://AstalHyprland";

const hyprland = Hyprland.get_default();

/**
 * Match Hyprland monitor to GDK monitor
 * THIS MAY NOT WORK AS INTENDED IF YOU HAVE MONITORS OF THE SAME MODEL
 * On some setups GDK coordinates and hyprland coordinates are flipped,
 * so we can't match by coordinates.
 */
function hyprToGdk(monitor: Hyprland.Monitor): Gdk.Monitor | null {
  const monitors = app.get_monitors();
  if (!monitors || monitors.length === 0) return null;

  for (let gdkmonitor of monitors) {
    if (
      monitor &&
      gdkmonitor &&
      monitor.get_name() === gdkmonitor.get_connector()
    )
      return gdkmonitor;
  }

  // Default monitor with null safety
  return monitors.length > 0 ? monitors[0] : null;
}

export const gdkmonitor = createBinding(
  hyprland,
  "focused-monitor",
)((focused: Hyprland.Monitor) => {
  const monitor = hyprToGdk(focused);
  if (monitor) return monitor;
  const monitors = app.get_monitors();
  return monitors[0];
});

export const currentMonitorWidth = createBinding(
  hyprland,
  "focused-monitor",
)((monitor: Hyprland.Monitor) => {
  return monitor ? monitor.width : 1000;
});
