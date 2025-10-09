import { register } from "ags/gobject";
import { BaseProvider } from "../SearchProvider";
import { WallpaperItem, ProviderConfig } from "../types";
import { getWallpaperStore } from "utils/wallpaper";
import type { ThemeMode, ThemeScheme } from "utils/wallpaper/types";

interface ThemeProvider {
  set ThemeMode(mode: ThemeMode);
  set ThemeScheme(scheme: ThemeScheme);
  get ThemeMode(): ThemeMode;
  get ThemeScheme(): ThemeScheme;
}

@register({ GTypeName: "WallpaperProvider" })
export class WallpaperProvider extends BaseProvider implements ThemeProvider {
  readonly config: ProviderConfig = {
    command: "wp",
    icon: "Image_Search",
    name: "Wallpapers",
    placeholder: "Search wallpapers...",
    component: "grid",
    maxResults: 12,
    features: {
      random: true,
      refresh: true,
    },
  };

  private store = getWallpaperStore({ includeHidden: true });

  constructor() {
    super();
    this.command = "wp";
  }

  async search(query: string): Promise<void> {
    this.setLoading(true);

    try {
      const trimmedQuery = query.trim();

      if (trimmedQuery.length === 0) {
        this.setDefaultResults(this.store.wallpapers);
      } else {
        const fuzzyResults = this.store.search(trimmedQuery);
        this.setResults(fuzzyResults.slice(0, this.config.maxResults));
      }
    } finally {
      this.setLoading(false);
    }
  }

  activate(item: WallpaperItem): void {
    this.store.setWallpaper(item.file);
  }

  async refresh(): Promise<void> {
    await this.store.refresh();
  }

  async random(): Promise<void> {
    await this.store.setRandomWallpaper();
  }

  async getThumbnail(imagePath: string) {
    return await this.store.getThumbnail(imagePath);
  }

  set ThemeMode(mode: ThemeMode) {
    this.store.setManualMode(mode);
  }

  set ThemeScheme(scheme: ThemeScheme) {
    this.store.setManualScheme(scheme);
  }

  get ThemeMode(): ThemeMode {
    return this.store.manualMode;
  }

  get ThemeScheme(): ThemeScheme {
    return this.store.manualScheme;
  }

  dispose(): void {
    this.store.dispose();
  }
}
