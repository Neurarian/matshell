import { register } from "ags/gobject";
import { BaseProvider } from "../SearchProvider";
import { WallpaperItem, ProviderConfig, ISearchProvider } from "../types";
import { getWallpaperStore } from "utils/wallpaper";

@register({ GTypeName: "WallpaperProvider" })
export class WallpaperProvider
  extends BaseProvider
  implements ISearchProvider<WallpaperItem>
{
  readonly config: ProviderConfig = {
    command: "wallpapers",
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
    this.command = "wallpapers";
  }

  async search(query: string): Promise<void> {
    this.setLoading(true);

    try {
      const trimmedQuery = query.trim();

      if (trimmedQuery.length === 0) {
        // Show frecency defaults
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

  dispose(): void {
    this.store.dispose();
  }
}
