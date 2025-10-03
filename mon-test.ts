// utils/monitor-debug.ts
import app from "ags/gtk4/app";
import { Gdk } from "ags/gtk4";

function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[MONITOR DEBUG ${timestamp}] ${message}`, data || "");
}

export function setupMonitorDebugListeners() {
  debugLog("Setting up monitor debug listeners");


  // Get display and monitor add/remove signals
  const display = Gdk.Display.get_default();
  if (display) {
    display.connect(
      "monitor-added",
      (_display: Gdk.Display, monitor: Gdk.Monitor) => {
        debugLog("GDK Monitor added", {
          connector: monitor.get_connector(),
          model: monitor.get_model(),
        });
      },
    );

    display.connect(
      "monitor-removed",
      (_display: Gdk.Display, monitor: Gdk.Monitor) => {
        debugLog("GDK Monitor removed", {
          connector: monitor.get_connector(),
          model: monitor.get_model(),
        });
      },
    );
  }

  // Log initial state
  const initialMonitors = app.get_monitors();
  debugLog("Initial monitors", {
    count: initialMonitors.length,
    monitors: initialMonitors.map((m) => ({
      connector: m.get_connector(),
      model: m.get_model(),
    })),
  });
}
