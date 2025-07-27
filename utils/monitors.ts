import app from "ags/gtk4/app";
import { createRoot } from "ags";
import { hyprToGdk } from "utils/hyprland.ts";
import Hyprland from "gi://AstalHyprland";

export interface BarData {
  windowName: string;
  dispose: () => void;
}

export type BarComponent = (gdkmonitor: any) => string;

export const createBarForMonitor = (
  hyprMonitor: Hyprland.Monitor,
  barData: Map<number, BarData>,
  BarComponent: BarComponent,
) => {
  try {
    const gdkmonitor = hyprToGdk(hyprMonitor);
    if (gdkmonitor) {
      let windowName!: string;
      const dispose = createRoot((disposeCallback) => {
        windowName = BarComponent(gdkmonitor);
        return disposeCallback;
      });

      barData.set(hyprMonitor.id, { windowName: windowName!, dispose });
      console.log(`Bar created successfully: ${windowName}`);
      return windowName;
    }
  } catch (error) {
    console.error(`Error in createBarForMonitor for ${hyprMonitor.id}:`, error);
    throw error;
  }
};

export const removeBarForMonitor = (
  id: number,
  barData: Map<number, BarData>,
): Promise<void> => {
  return new Promise<void>((resolve) => {
    try {
      console.log(`Monitor removed - ID: ${id}`);
      const data = barData.get(id);

      if (data) {
        const { windowName, dispose } = data;
        const window = app.get_window(windowName);

        if (window) {
          console.log(`Removing bar: ${windowName}`);

          try {
            dispose();

            // Hide the window first
            window.set_visible(false);

            // Remove from app after a brief delay
            setTimeout(() => {
              try {
                app.remove_window(window);
                console.log(`Bar removed successfully: ${windowName}`);
              } catch (error) {
                console.error(`Error removing window ${windowName}:`, error);
              } finally {
                resolve();
              }
            }, 100);
          } catch (error) {
            console.error(`Error in window cleanup for ${windowName}:`, error);
            resolve();
          }
        } else {
          console.warn(`Window ${windowName} not found in app`);
          // Still call dispose to clean up reactive context
          dispose();
          resolve();
        }

        barData.delete(id);
      } else {
        console.warn(`No bar data found for monitor ID ${id}`);
        resolve();
      }
    } catch (error) {
      console.error(`Error in removeBarForMonitor for ID ${id}:`, error);
      resolve();
    }
  });
};

export const createBarDataMap = () => {
  return new Map<number, BarData>();
};
