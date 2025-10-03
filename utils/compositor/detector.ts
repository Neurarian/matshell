import { CompositorAdapter } from "./types";

async function detectCompositor(): Promise<CompositorAdapter> {
  const adapterFactories = [
    async () => {
      try {
        const { RiverAdapter } = await import("./river");
        return new RiverAdapter();
      } catch (error) {
        throw error;
      }
    },
    async () => {
      try {
        const { HyprlandAdapter } = await import("./hyprland");
        return new HyprlandAdapter();
      } catch (error) {
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
      // Don't log this. Only if both fail.
      continue;
    }
  }

  throw new Error(
    "No supported compositor detected. Make sure you're running Hyprland or River.",
  );
}

export const compositor = await detectCompositor();
