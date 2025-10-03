// utils/monitors.ts
import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { compositor } from "./compositor/detector";

// Now we can use the adapter's reactive bindings directly
export const gdkmonitor = compositor.focusedMonitor((focused) => {
  if (!focused) {
    const monitors = app.get_monitors();
    return monitors.length > 0 ? monitors[0] : null;
  }

  const monitor = compositor.matchMonitor(focused);
  if (monitor) return monitor;

  const monitors = app.get_monitors();
  return monitors.length > 0 ? monitors[0] : null;
});

export const currentMonitorWidth = compositor.focusedMonitor((monitor) => {
  return monitor ? monitor.width : 1000;
});

// Export reactive bindings directly
export const workspaces = compositor.workspaces;
export const focusedWorkspace = compositor.focusedWorkspace;
export const clients = compositor.clients;
export const focusedClient = compositor.focusedClient;
