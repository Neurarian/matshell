import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import Hyprland from "gi://AstalHyprland";

/* Match Hyprland monitor to GDK monitor
THIS MAY NOT WORK AS INTENDED IF YOU HAVE MONITORS OF THE SAME MODEL
I did not find a more elegant solution to this. 
On my setup GDK coordinates and hyprland coordinates are flipped,
so I cant match by coordinates. */

export function hyprToGdk(monitor: Hyprland.Monitor): Gdk.Monitor | null {
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
