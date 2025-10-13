import GObject from "ags/gobject";
import Gio from "gi://Gio";
import { Gdk } from "ags/gtk4";
import { Accessor } from "ags";
import { timeout, Timer } from "ags/time";
import { register, property, signal } from "ags/gobject";
import { getThumbnailManager, ThumbnailManager } from ".";
import { FileSystemScanner } from "./FileSystemScanner";
import { WallpaperSetter } from "./WallpaperSetter";
import { ThemeAnalyzer } from "./ThemeAnalyzer";
import { ThemeApplicator } from "./ThemeApplicator";
import { LRUCache } from "./LRUCache";
import options from "options";
import Fuse from "../fuse.js";
import type { WallpaperItem } from "utils/picker/types.ts";
import type { ThemeProperties } from "./types.ts";
import { monitorFile } from "ags/file.ts";

interface WallpaperSettings {
  directory: Accessor<string>;
  current: Accessor<string>;
  maxCacheSize: Accessor<number>;
  includeHidden: boolean;
}

@register({ GTypeName: "WallpaperStore" })
export class WallpaperStore extends GObject.Object {
  @property(Array) wallpapers: WallpaperItem[] = [];
  @property(String) currentWallpaperPath: string = "";
  @property(Number) maxItems: number = 12;
  @property(Object) manualMode: ThemeProperties["mode"] = "auto";
  @property(String) manualScheme: ThemeProperties["scheme"] = "auto";

  @signal([Array], GObject.TYPE_NONE, { default: false })
  wallpapersChanged(wallpapers: WallpaperItem[]): undefined {}

  @signal([String], GObject.TYPE_NONE, { default: false })
  wallpaperSet(path: string): undefined {}

  @signal([String, String], GObject.TYPE_NONE, { default: false })
  themeSettingsChanged(mode: string, scheme: string): undefined {}

  private fuse!: Fuse;
  private settings: WallpaperSettings;
  private unsubscribers: (() => void)[] = [];
  private themeDebounceTimer: Timer | null = null;
  private readonly THEME_DEBOUNCE_DELAY = 100;
  private dirMonitor: Gio.FileMonitor | null = null;
  private reloadDebounceTimer: Timer | null = null;
  private readonly RELOAD_DEBOUNCE_DELAY = 1000;

  private fileScanner: FileSystemScanner;
  private wallpaperSetter: WallpaperSetter;
  private themeAnalyzer: ThemeAnalyzer;
  private themeApplicator: ThemeApplicator;
  private themeCache: LRUCache<ThemeProperties>;
  private thumbnailManager: ThumbnailManager;

  constructor(params: { includeHidden?: boolean } = {}) {
    super();

    // Option accesssor configuration
    this.settings = {
      directory: options["wallpaper.dir"],
      current: options["wallpaper.current"],
      maxCacheSize: options["wallpaper.theme.cache-size"],
      includeHidden: params.includeHidden ?? false,
    };

    this.fileScanner = new FileSystemScanner();
    this.wallpaperSetter = new WallpaperSetter();
    this.themeAnalyzer = new ThemeAnalyzer();
    this.themeApplicator = new ThemeApplicator();
    this.themeCache = new LRUCache(this.settings.maxCacheSize.get());
    this.thumbnailManager = getThumbnailManager();

    this.setupWatchers();
    this.loadThemeCache();
    this.loadWallpapers();
  }

  private setupWatchers(): void {
    const dirUnsubscribe = this.settings.directory.subscribe(() => {
      this.loadWallpapers();
      this.setupDirectoryMonitor();
    });

    const cacheSizeUnsubscribe = this.settings.maxCacheSize.subscribe(() => {
      const newSize = this.settings.maxCacheSize.get();
      this.themeCache.updateMaxSize(newSize);
    });

    this.unsubscribers.push(dirUnsubscribe, cacheSizeUnsubscribe);
    this.setupDirectoryMonitor();
  }
  private setupDirectoryMonitor(): void {
    // Clean up old monitor
    if (this.dirMonitor) {
      this.dirMonitor.cancel();
      this.dirMonitor = null;
    }

    const dirPath = this.settings.directory.get();

    try {
      this.dirMonitor = monitorFile(
        dirPath,
        (file: string, event: Gio.FileMonitorEvent) => {
          // Only react to relevant events
          if (
            event === Gio.FileMonitorEvent.CREATED ||
            event === Gio.FileMonitorEvent.DELETED ||
            event === Gio.FileMonitorEvent.MOVED_IN ||
            event === Gio.FileMonitorEvent.MOVED_OUT
          ) {
            this.scheduleWallpaperReload();
          }
        },
      );
      console.log(`Monitoring wallpaper directory: ${dirPath}`);
    } catch (error) {
      console.warn("Failed to setup directory monitor:", error);
    }
  }

  async setWallpaper(file: Gio.File): Promise<void> {
    const imagePath = file.get_path();
    if (!imagePath) {
      throw new Error("Could not get file path for wallpaper");
    }

    const currentWallpaper = this.settings.current.get();
    if (currentWallpaper === imagePath) return;

    const result = await this.wallpaperSetter.setWallpaper(imagePath);

    if (!result.success) {
      throw result.error || new Error("Failed to set wallpaper");
    }

    options["wallpaper.current"].value = imagePath;
    this.currentWallpaperPath = imagePath;

    this.emit("wallpaper-set", imagePath);
    this.scheduleThemeUpdate(imagePath);
  }

  async setRandomWallpaper(): Promise<void> {
    if (this.wallpapers.length === 0) {
      throw new Error("No wallpapers available for random selection");
    }

    // Don't use current one
    const filteredWallpapers = this.wallpapers.filter(
      (item) => item.path !== this.settings.current.get(),
    );

    if (filteredWallpapers.length === 0) {
      console.log("Only one wallpaper available, keeping current");
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredWallpapers.length);
    const randomWallpaper = filteredWallpapers[randomIndex];

    await this.setWallpaper(randomWallpaper.file);
  }

  // Automatic with debounce on e.g. bulk download
  private scheduleWallpaperReload(): void {
    if (this.reloadDebounceTimer) {
      this.reloadDebounceTimer.cancel();
    }

    this.reloadDebounceTimer = timeout(this.RELOAD_DEBOUNCE_DELAY, () => {
      console.log("Reloading wallpapers due to filesystem changes");
      this.loadWallpapers();
      this.reloadDebounceTimer = null;
    });
  }

  // Manual
  async refresh(): Promise<void> {
    this.loadWallpapers();
  }

  search(text: string): WallpaperItem[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const results = this.fuse.search(text, { limit: this.maxItems });
    return results.map((result) => result.item);
  }

  setManualMode(mode: ThemeProperties["mode"]): void {
    if (this.manualMode !== mode) {
      this.manualMode = mode;
      this.emit("theme-settings-changed", mode, this.manualScheme);

      if (this.currentWallpaperPath) {
        this.scheduleThemeUpdate(this.currentWallpaperPath);
      }
    }
  }

  setManualScheme(scheme: ThemeProperties["scheme"]): void {
    if (this.manualScheme !== scheme) {
      this.manualScheme = scheme;
      this.emit("theme-settings-changed", this.manualMode, scheme);

      if (this.currentWallpaperPath) {
        this.scheduleThemeUpdate(this.currentWallpaperPath);
      }
    }
  }

  async getThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    return this.thumbnailManager.getThumbnail(imagePath);
  }

  clearThemeCache(): void {
    this.themeCache.clear();
    options["wallpaper.theme.cache"].value = {};
    console.log("Theme cache cleared");
  }

  private loadWallpapers(): void {
    try {
      const dirPath = this.settings.directory.get();
      const files = this.fileScanner.scan(dirPath, {
        includeHidden: this.settings.includeHidden,
        maxDepth: 2,
      });

      const imageFiles = files.filter((file) =>
        this.fileScanner.isImageFile(file),
      );

      const items: WallpaperItem[] = imageFiles.map((file) => {
        const path = file.get_path();
        return {
          id: path || file.get_uri(),
          name: file.get_basename() || "Unknown",
          description: "Image",
          iconName: "image-x-generic",
          path: path ?? undefined,
          file: file,
        };
      });

      this.wallpapers = items;
      this.updateFuse();
      this.emit("wallpapers-changed", items);

      console.log(`Loaded ${imageFiles.length} wallpapers from ${dirPath}`);
    } catch (error) {
      console.error("Failed to load wallpapers:", error);
      this.wallpapers = [];
      this.emit("wallpapers-changed", []);
    }
  }

  private updateFuse(): void {
    this.fuse = new Fuse(this.wallpapers, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.6,
      location: 0,
      distance: 100,
      minMatchCharLength: 1,
      ignoreLocation: true,
      ignoreFieldNorm: false,
      useExtendedSearch: false,
      shouldSort: true,
      isCaseSensitive: false,
    });
  }

  private scheduleThemeUpdate(imagePath: string): void {
    if (this.themeDebounceTimer) {
      this.themeDebounceTimer.cancel();
    }

    this.themeDebounceTimer = timeout(this.THEME_DEBOUNCE_DELAY, () => {
      this.applyWallpaperTheme(imagePath).catch((error) => {
        console.error("Theme application failed:", error);
      });
      this.themeDebounceTimer = null;
    });
  }

  private async applyWallpaperTheme(imagePath: string): Promise<void> {
    try {
      let analysis: ThemeProperties;

      const needsAutoMode = this.manualMode === "auto";
      const needsAutoScheme = this.manualScheme === "auto";

      if (!needsAutoMode && !needsAutoScheme) {
        analysis = {
          tone: 0,
          chroma: 0,
          mode: this.manualMode,
          scheme: this.manualScheme,
        };
      } else {
        // Check cache first
        const cached = this.themeCache.get(imagePath);

        if (cached) {
          analysis = {
            tone: cached.tone,
            chroma: cached.chroma,
            mode: needsAutoMode ? cached.mode : this.manualMode,
            scheme: needsAutoScheme ? cached.scheme : this.manualScheme,
          };
        } else {
          const autoAnalysis = await this.themeAnalyzer.analyzeImage(imagePath);

          this.themeCache.set(imagePath, autoAnalysis);
          this.saveThemeCache();

          analysis = {
            tone: autoAnalysis.tone,
            chroma: autoAnalysis.chroma,
            mode: needsAutoMode ? autoAnalysis.mode : this.manualMode,
            scheme: needsAutoScheme ? autoAnalysis.scheme : this.manualScheme,
          };
        }
      }

      await this.themeApplicator.applyTheme(imagePath, analysis);
    } catch (error) {
      console.error("Failed to apply wallpaper theme:", error);
    }
  }

  private loadThemeCache(): void {
    const persistentCache = options["wallpaper.theme.cache"].get();
    this.themeCache.fromJSON(persistentCache);
  }

  private saveThemeCache(): void {
    setTimeout(() => {
      try {
        options["wallpaper.theme.cache"].value = this.themeCache.toJSON();
      } catch (error) {
        console.error("Failed to save theme cache:", error);
      }
    }, 0);
  }

  dispose(): void {
    if (this.themeDebounceTimer) {
      this.themeDebounceTimer.cancel();
      this.themeDebounceTimer = null;
    }

    if (this.reloadDebounceTimer) {
      this.reloadDebounceTimer.cancel();
      this.reloadDebounceTimer = null;
    }

    if (this.dirMonitor) {
      this.dirMonitor.cancel();
      this.dirMonitor = null;
    }

    this.unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error during unsubscribe:", error);
      }
    });
    this.unsubscribers = [];

    this.wallpaperSetter.dispose();
    this.themeCache.clear();
  }
}
