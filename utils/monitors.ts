import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { compositor } from "./compositor/detector";
import { Monitor } from "./compositor/types";

function getValidMonitor(focused: Monitor | null): Gdk.Monitor {
  if (focused) {
    const monitor = compositor.matchMonitor(focused);
    if (monitor) return monitor;
  }

  const monitors = app.get_monitors();
  return monitors[0];
}

export const gdkmonitor = compositor.focusedMonitor((focused) =>
  getValidMonitor(focused),
);

export const currentMonitorWidth = compositor.focusedMonitor((monitor) => {
  return monitor ? monitor.width : 1000;
});

// Export reactive bindings directly
export const workspaces = compositor.workspaces;
export const focusedWorkspace = compositor.focusedWorkspace;
export const clients = compositor.clients;
export const focusedClient = compositor.focusedClient;
