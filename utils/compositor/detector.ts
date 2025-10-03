/**
  Compositor Adapter Configuration

  Matshell supports River and Hyprland compositors through optional Astal libraries.

  Installation:
    Hyprland: Install astal-hyprland
    River: Install astal-river

  Configuration:
    If you have BOTH libraries installed: You can leave all imports and factories as they are
    If you ONLY have Hyprland: Comment out the River import and factory
    If you ONLY have River: Comment out the Hyprland import and factory
 */
import { HyprlandAdapter } from "./hyprland";
import { RiverAdapter } from "./river";
import { CompositorAdapter } from "./types";

function detectCompositor(): CompositorAdapter {
  const adapterFactories = [
    () => new RiverAdapter(),
    () => new HyprlandAdapter(),
  ];

  for (const createAdapter of adapterFactories) {
    try {
      const adapter = createAdapter();
      if (adapter.isAvailable()) {
        console.log(`Detected compositor: ${adapter.name}`);
        return adapter;
      }
    } catch (error) {
      console.warn(`Failed to initialize adapter: ${error}`);
      continue;
    }
  }

  throw new Error(
    "No supported compositor detected. Make sure you're running Hyprland or River.",
  );
}

export const compositor = detectCompositor();
