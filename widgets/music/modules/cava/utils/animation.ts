import GLib from  "gi://GLib?version=2.0";
import { TimeState } from "./types.ts";

export function calculateTimeDelta(state: TimeState): number {
  const now = GLib.get_monotonic_time() / 1000000;
  const deltaTime = state.lastUpdate === 0 ? 0.016 : now - state.lastUpdate;
  state.lastUpdate = now;
  return Math.min(0.05, deltaTime);
}
