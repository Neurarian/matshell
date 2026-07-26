import { PickerCoordinator } from "./PickerCoordinator.ts";
import { AppProvider } from "./providers/AppProvider.ts";
import { WallpaperProvider } from "./providers/WallpaperProvider.ts";
import { ClipboardProvider } from "./providers/ClipboardProvider";
import { RssProvider } from "./providers/RssProvider.ts";
// Create singleton instance and configure
const coordinator = PickerCoordinator.getInstance();
coordinator.addProvider(new AppProvider());
coordinator.addProvider(new WallpaperProvider());
coordinator.addProvider(new ClipboardProvider());
coordinator.addProvider(new RssProvider());

export const picker = coordinator;

export { PickerCoordinator } from "./PickerCoordinator.ts";
export * from "./providers/AppProvider.ts";
export * from "./providers/WallpaperProvider.ts";
