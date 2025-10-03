// utils/monitors.ts
import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { compositor } from "./compositor/detector";

// Now we can use the adapter's reactive bindings directly
export const gdkmonitor = compositor.focusedMonitor((focused): Gdk.Monitor => {
  const monitors = app.get_monitors();

  if (!monitors || monitors.length === 0) {
    throw new Error("No GDK monitors available - this should not happen");
  }

  // Default to first monitor
  const defaultMonitor = monitors[0];

  // If no focused compositor monitor, use default
  if (!focused) {
    return defaultMonitor;
  }

  // Try to match compositor monitor to GDK monitor
  const matched = compositor.matchMonitor(focused);

  // Return matched or fallback to default
  return matched ?? defaultMonitor;
});

export const currentMonitorWidth = compositor.focusedMonitor((monitor) => {
  return monitor ? monitor.width : 1000;
});

// Export reactive bindings directly
export const workspaces = compositor.workspaces;
export const focusedWorkspace = compositor.focusedWorkspace;
export const clients = compositor.clients;
export const focusedClient = compositor.focusedClient;
