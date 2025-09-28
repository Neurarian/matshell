import { ThumbnailManager } from "./ThumbnailManager";
import { WallpaperStore } from "./WallpaperStore";

// Classes
export { WallpaperStore } from "./WallpaperStore";
export { ThumbnailManager } from "./ThumbnailManager";

// Types
export type {
  CachedThumbnail,
  ThemeProperties,
  CachedThemeEntry,
  ThumbnailRequest,
} from "./types";

// Thumbnail manager singleton management
let thumbnailManagerInstance: ThumbnailManager | null = null;
export function getThumbnailManager(): ThumbnailManager {
  if (!thumbnailManagerInstance) {
    thumbnailManagerInstance = new ThumbnailManager();
  }
  return thumbnailManagerInstance;
}

// Wallpaper store singleton
let wallpaperStoreInstance: WallpaperStore | null = null;

export function getWallpaperStore(params?: {
  includeHidden?: boolean;
}): WallpaperStore {
  if (!wallpaperStoreInstance) {
    wallpaperStoreInstance = new WallpaperStore(params);
  }
  return wallpaperStoreInstance;
}
