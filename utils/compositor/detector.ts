import { CompositorAdapter } from "./types";

async function detectCompositor(): Promise<CompositorAdapter> {
  const adapterFactories = [
    async () => {
      try {
        const { HyprlandAdapter } = await import("./hyprland");
        return new HyprlandAdapter();
      } catch (error) {
        console.warn("Hyprland adapter unavailable:", error);
        throw error;
      }
    },
    async () => {
      try {
        const { RiverAdapter } = await import("./river");
        return new RiverAdapter();
      } catch (error) {
        console.warn("River adapter unavailable:", error);
        throw error;
      }
    },
  ];

  for (const createAdapter of adapterFactories) {
    try {
      const adapter = await createAdapter();
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

export const compositor = await detectCompositor();
