import { PickerCoordinator } from "./PickerCoordinator.ts";
import { AppProvider } from "./providers/AppProvider.ts";
import { WallpaperProvider } from "./providers/WallpaperProvider.ts";

// Create singleton instance and configure
const coordinator = PickerCoordinator.getInstance();
coordinator.addProvider(new AppProvider());
coordinator.addProvider(new WallpaperProvider());

export const picker = coordinator;

export { PickerCoordinator } from "./PickerCoordinator.ts";
export * from "./providers/AppProvider.ts";
export * from "./providers/WallpaperProvider.ts";
