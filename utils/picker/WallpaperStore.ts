import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GdkPixbuf from "gi://GdkPixbuf";
import { Gdk } from "ags/gtk4";
import { Accessor } from "ags";
import { execAsync } from "ags/process";
import { timeout, Timer } from "ags/time";
import { register, property, signal } from "ags/gobject";
import options from "options";
import Fuse from "./fuse.js";
import type {
  WallpaperItem,
  CachedThemeEntry,
  CachedThumbnail,
  ThemeProperties,
} from "./types.ts";

@register({ GTypeName: "WallpaperStore" })
export class WallpaperStore extends GObject.Object {
  @property(Array) wallpapers: WallpaperItem[] = [];
  @property(String) currentWallpaperPath: string = "";
  @property(Boolean) includeHidden: boolean = false;
  @property(Number) maxItems: number = 12;

  @signal([Array], GObject.TYPE_NONE, { default: false })
  wallpapersChanged(wallpapers: WallpaperItem[]): undefined {}

  @signal([String], GObject.TYPE_NONE, { default: false })
  wallpaperSet(path: string): undefined {}

  private files: Gio.File[] = [];
  private fuse!: Fuse;

  // Configuration accessors
  private wallpaperDir: Accessor<string>;
  private currentWallpaper: Accessor<string>;
  private maxThumbnailCacheSize: Accessor<number>;
  private maxThemeCacheSize: Accessor<number>;

  private unsubscribers: (() => void)[] = [];

  // Caching
  private thumbnailCache = new Map<string, CachedThumbnail>();
  private themeCache = new Map<string, CachedThemeEntry>();
  private thumbnailCleanupInterval: any;

  // Debounce fast theme changes
  private themeDebounceTimer: Timer | null = null;
  private readonly THEME_DEBOUNCE_DELAY = 100;

  constructor(params: { includeHidden?: boolean } = {}) {
    super();

    this.includeHidden = params.includeHidden ?? false;

    // Setup accessors from options
    this.wallpaperDir = options["wallpaper.dir"]((wd) => String(wd));
    this.currentWallpaper = options["wallpaper.current"]((w) => String(w));
    this.maxThumbnailCacheSize = options["wallpaper.cache-size"]((c) => Number(c));
    this.maxThemeCacheSize = options["wallpaper.theme-cache-size"]((s) =>
      Number(s),
    );

    // Connect to option changes
    this.setupWatchers();

    // Init
    this.loadThemeCache();
    this.loadWallpapers();
    this.startPeriodicCleanup();
  }

  // Setup & Configuration
  private setupWatchers(): void {
    const dirUnsubscribe = this.wallpaperDir.subscribe(() => {
      this.loadWallpapers();
    });
    this.unsubscribers.push(dirUnsubscribe);
  }

  private loadThemeCache(): void {
    try {
      const persistentCache = options["wallpaper.theme-cache"].get() as Record<
        string,
        any
      >;
      for (const [path, entry] of Object.entries(persistentCache)) {
        if (typeof entry === "object" && entry.timestamp) {
          this.themeCache.set(path, entry as CachedThemeEntry);
        }
      }
    } catch (error) {
      console.warn("Failed to load theme cache:", error);
      this.emit("error", "Failed to load theme cache");
    }
  }

  private saveThemeCache(): void {
    setTimeout(() => {
      try {
        const persistentCache: Record<string, CachedThemeEntry> = {};
        for (const [path, entry] of this.themeCache) {
          persistentCache[path] = entry;
        }
        options["wallpaper.theme-cache"].value = persistentCache as any;
      } catch (error) {
        console.error("Failed to save theme cache:", error);
        this.emit("error", "Failed to save theme cache");
      }
    }, 0);
  }

  // Wallpaper Loading & Scanning
  private loadWallpapers(): void {
    try {
      const dirPath = this.wallpaperDir.get();
      if (!GLib.file_test(dirPath, GLib.FileTest.EXISTS)) {
        console.warn(`Wallpaper directory does not exist: ${dirPath}`);
        this.updateWallpapers([], []);
        return;
      }

      this.files = this.ls(dirPath, {
        level: 2,
        includeHidden: this.includeHidden,
      }).filter((file) => {
        const info = file.query_info(
          Gio.FILE_ATTRIBUTE_STANDARD_CONTENT_TYPE,
          Gio.FileQueryInfoFlags.NONE,
          null,
        );
        return info.get_content_type()?.startsWith("image/") ?? false;
      });

      const items = this.files.map((file) => {
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

      this.updateWallpapers(this.files, items);
      console.log(`Loaded ${this.files.length} wallpapers from ${dirPath}`);
    } catch (error) {
      console.error("Failed to load wallpapers:", error);
      this.emit("error", "Failed to load wallpapers");
      this.updateWallpapers([], []);
    }
  }

  private updateWallpapers(files: Gio.File[], items: WallpaperItem[]): void {
    this.files = files;
    this.wallpapers = items;
    this.updateFuse();
    this.emit("wallpapers-changed", items);
  }

  private ls(
    dir: string,
    props?: { level?: number; includeHidden?: boolean },
  ): Gio.File[] {
    const { level = 0, includeHidden = false } = props ?? {};
    if (!GLib.file_test(dir, GLib.FileTest.IS_DIR)) {
      return [];
    }

    const files: Gio.File[] = [];
    try {
      const enumerator = Gio.File.new_for_path(dir).enumerate_children(
        "standard::name,standard::type",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const file = enumerator.get_child(info);
        const basename = file.get_basename();

        if (basename?.startsWith(".") && !includeHidden) {
          continue;
        }

        const type = file.query_file_type(Gio.FileQueryInfoFlags.NONE, null);
        if (type === Gio.FileType.DIRECTORY && level > 0) {
          files.push(
            ...this.ls(file.get_path()!, {
              includeHidden,
              level: level - 1,
            }),
          );
        } else {
          files.push(file);
        }
      }
    } catch (error) {
      console.error(`Failed to list directory ${dir}:`, error);
    }

    return files;
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

  // Public API Methods
  search(text: string): WallpaperItem[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const results = this.fuse.search(text, { limit: this.maxItems });
    return results.map((result) => result.item);
  }

  async setRandomWallpaper(): Promise<void> {
    if (this.wallpapers.length === 0) {
      console.warn("No wallpapers available for random selection");
      this.emit("error", "No wallpapers available");
      return;
    }

    const currentWallpaperPath = this.currentWallpaper.get();
    const availableWallpapers = this.wallpapers.filter(
      (item) => item.path !== currentWallpaperPath,
    );

    const wallpapers =
      availableWallpapers.length > 0 ? availableWallpapers : this.wallpapers;
    const randomIndex = Math.floor(Math.random() * wallpapers.length);
    const randomWallpaper = wallpapers[randomIndex];

    await this.setWallpaper(randomWallpaper.file);
  }

  async refresh(): Promise<void> {
    this.loadWallpapers();
  }

  // Wallpaper Setting & Theme Application
  async setWallpaper(file: Gio.File): Promise<void> {
    const imagePath = file.get_path();
    if (!imagePath) {
      console.error("Could not get file path for wallpaper");
      this.emit("error", "Could not get file path for wallpaper");
      return;
    }

    const currentWallpaper = this.currentWallpaper.get();
    if (currentWallpaper === imagePath) {
      return;
    }

    // Update current wallpaper immediately
    options["wallpaper.current"].value = imagePath;
    this.currentWallpaperPath = imagePath;

    const wallpaperPromise = this.setWallpaperHyprctl(imagePath);
    this.scheduleThemeUpdate(imagePath);

    try {
      await wallpaperPromise;
      this.emit("wallpaper-set", imagePath);
    } catch (error) {
      console.error("Wallpaper setting failed:", error);
      this.emit("error", `Wallpaper setting failed: ${error}`);
      // Revert config on failure
      options["wallpaper.current"].value = currentWallpaper;
      this.currentWallpaperPath = currentWallpaper;
    }
  }

  private async setWallpaperHyprctl(imagePath: string): Promise<void> {
    const hyprctl = GLib.find_program_in_path("hyprctl");
    if (!hyprctl) {
      throw new Error("hyprctl not found");
    }

    console.log(`Setting wallpaper: ${imagePath}`);

    // Unload and get monitors in parallel
    const unloadPromise = execAsync(`${hyprctl} hyprpaper unload all`);
    const monitorPromise = execAsync(`${hyprctl} monitors -j`);

    const [, monitorOutput] = await Promise.all([
      unloadPromise,
      monitorPromise,
    ]);

    // Preload after unload completes
    await execAsync(`${hyprctl} hyprpaper preload "${imagePath}"`);

    const monitors = JSON.parse(monitorOutput);

    await Promise.all(
      monitors.map((monitor: any) =>
        execAsync(
          `${hyprctl} hyprpaper wallpaper "${monitor.name},${imagePath}"`,
        ),
      ),
    );
  }

  private scheduleThemeUpdate(imagePath: string): void {
    if (this.themeDebounceTimer) {
      this.themeDebounceTimer.cancel();
    }

    this.themeDebounceTimer = timeout(this.THEME_DEBOUNCE_DELAY, () => {
      this.applyWallpaperTheme(imagePath).catch((error) => {
        console.error("Theme application failed:", error);
        this.emit("error", `Theme application failed: ${error}`);
      });
      this.themeDebounceTimer = null;
    });
  }

  // Theme Processing
  private async applyWallpaperTheme(imagePath: string): Promise<void> {
    try {
      const analysis = await this.analyzeImageColors(imagePath);

      await Promise.all([
        this.applyMatugen(imagePath, analysis),
        this.writeThemeVariables(analysis),
      ]);

      setTimeout(() => this.sendThemeNotification(imagePath, analysis), 0);
    } catch (error) {
      console.error("Failed to apply wallpaper theme:", error);
      this.emit("error", `Failed to apply wallpaper theme: ${error}`);
    } finally {
    }
  }

  private async analyzeImageColors(
    imagePath: string,
  ): Promise<ThemeProperties> {
    // Check cache first
    const cached = this.themeCache.get(imagePath);
    if (cached) {
      return {
        tone: cached.tone,
        chroma: cached.chroma,
        mode: cached.mode,
        scheme: cached.scheme,
      };
    }

    let analysis: ThemeProperties;

    // Try image-hct first (fastest)
    const imageHct = GLib.find_program_in_path("image-hct");
    if (imageHct) {
      try {
        const output = await execAsync(
          `bash -c '${imageHct} "${imagePath}" tone; ${imageHct} "${imagePath}" chroma'`,
        );
        const lines = output.trim().split("\n");
        if (lines.length >= 2) {
          const tone = parseInt(lines[0].trim());
          const chroma = parseInt(lines[1].trim());
          analysis = {
            tone,
            chroma,
            mode: tone > 60 ? "light" : "dark",
            scheme: chroma < 20 ? "scheme-neutral" : "scheme-vibrant",
          };

          this.cacheThemeAnalysis(imagePath, analysis);
          return analysis;
        }
      } catch (error) {
        console.warn("image-hct failed, trying ImageMagick fallback:", error);
      }
    }

    // Try ImageMagick fallback
    const magickAnalysis = await this.analyzeWithImageMagick(imagePath);
    if (magickAnalysis) {
      this.cacheThemeAnalysis(imagePath, magickAnalysis);
      return magickAnalysis;
    }

    // Final fallback
    analysis = this.fallbackColorAnalysis(imagePath);
    this.cacheThemeAnalysis(imagePath, analysis);
    return analysis;
  }

  private async analyzeWithImageMagick(
    imagePath: string,
  ): Promise<ThemeProperties | null> {
    const magick =
      GLib.find_program_in_path("magick") ||
      GLib.find_program_in_path("convert");
    if (!magick) return null;

    try {
      const bashCommand = `bash -c '
        BRIGHTNESS=$(${magick} "${imagePath}" -colorspace Gray -format "%[fx:mean]" info:)
        COLOR=$(${magick} "${imagePath}" -scale 1x1! -format "%[pixel:u.p{0,0}]" info:)
        echo "brightness:$BRIGHTNESS"
        echo "color:$COLOR"
      '`;

      const output = await execAsync(bashCommand);
      const lines = output.trim().split("\n");

      let brightness = 50;
      let isGrayscale = false;

      for (const line of lines) {
        if (line.startsWith("brightness:")) {
          const value = parseFloat(line.substring(11));
          if (!isNaN(value)) {
            brightness = Math.round(value * 100);
          }
        } else if (line.startsWith("color:")) {
          const colorValue = line.substring(6);
          const colorMatch = colorValue.match(/srgb\((\d+),(\d+),(\d+)\)/);
          if (colorMatch) {
            const [, r, g, b] = colorMatch.map(Number);
            const maxDiff = Math.max(
              Math.abs(r - g),
              Math.abs(r - b),
              Math.abs(g - b),
            );
            isGrayscale = maxDiff < 20;
          }
        }
      }

      return {
        tone: brightness,
        chroma: isGrayscale ? 10 : 40,
        mode: brightness > 50 ? "light" : "dark",
        scheme: isGrayscale ? "scheme-neutral" : "scheme-vibrant",
      };
    } catch (error) {
      console.warn("ImageMagick analysis failed:", error);
      return null;
    }
  }

  private fallbackColorAnalysis(imagePath: string): ThemeProperties {
    const basename = GLib.path_get_basename(imagePath).toLowerCase();

    let mode: "light" | "dark" = "dark";
    let scheme: "scheme-neutral" | "scheme-vibrant" = "scheme-vibrant";

    // Filename-based heuristics
    if (
      basename.includes("light") ||
      basename.includes("day") ||
      basename.includes("bright")
    ) {
      mode = "light";
    } else if (
      basename.includes("dark") ||
      basename.includes("night") ||
      basename.includes("moon")
    ) {
      mode = "dark";
    } else {
      // Time-based fallback
      const hour = new Date().getHours();
      mode = hour >= 6 && hour < 18 ? "light" : "dark";
    }

    if (
      basename.includes("neutral") ||
      basename.includes("gray") ||
      basename.includes("grey") ||
      basename.includes("mono") ||
      basename.includes("black") ||
      basename.includes("white")
    ) {
      scheme = "scheme-neutral";
    }

    return {
      tone: mode === "light" ? 80 : 20,
      chroma: scheme === "scheme-vibrant" ? 40 : 10,
      mode,
      scheme,
    };
  }

  private cacheThemeAnalysis(
    imagePath: string,
    analysis: ThemeProperties,
  ): void {
    const entry: CachedThemeEntry = {
      ...analysis,
      timestamp: Date.now(),
    };

    this.themeCache.set(imagePath, entry);

    if (this.themeCache.size > this.maxThemeCacheSize.get()) {
      setTimeout(() => this.cleanupThemeCache(), 0);
    }
    this.saveThemeCache();
  }

  private cleanupThemeCache(): void {
    const maxSize = this.maxThemeCacheSize.get();
    if (this.themeCache.size <= maxSize) return;

    const entries = Array.from(this.themeCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    const toRemove = this.themeCache.size - maxSize;
    for (let i = 0; i < toRemove; i++) {
      this.themeCache.delete(entries[i][0]);
    }
  }

  private async applyMatugen(
    imagePath: string,
    analysis: ThemeProperties,
  ): Promise<void> {
    const matugen = GLib.find_program_in_path("matugen");
    if (!matugen) {
      console.warn("matugen not found, skipping color theme generation");
      return;
    }

    try {
      await execAsync(
        `${matugen} -t "${analysis.scheme}" -m "${analysis.mode}" image "${imagePath}"`,
      );
    } catch (error) {
      console.error("Failed to run matugen:", error);
      throw error;
    }
  }

  private writeThemeVariables(analysis: ThemeProperties): void {
    try {
      const configDir = GLib.get_user_config_dir();
      const scssFile = `${configDir}/ags/style/abstracts/_theme_variables_matugen.scss`;
      const content = [
        "",
        "/* Theme mode and scheme variables */",
        `$darkmode: ${analysis.mode === "dark"};`,
        `$material-color-scheme: "${analysis.scheme}";`,
        "",
      ].join("\n");

      const file = Gio.File.new_for_path(scssFile);
      file.replace_contents(
        new TextEncoder().encode(content),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null,
      );
    } catch (error) {
      console.error("Failed to write theme variables:", error);
      throw error;
    }
  }

  private sendThemeNotification(
    imagePath: string,
    analysis: ThemeProperties,
  ): void {
    try {
      const notifySend = GLib.find_program_in_path("notify-send");
      if (!notifySend) return;

      const basename = GLib.path_get_basename(imagePath);
      const message = `Theme: ${analysis.mode} ${analysis.scheme}`;

      GLib.spawn_command_line_async(
        `${notifySend} "Colors and Wallpaper updated" "Image: ${basename}\n${message}"`,
      );
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }

  // Thumbnail Management
  async getThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    const cached = this.thumbnailCache.get(imagePath);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.texture;
    }

    try {
      const texture = await this.loadThumbnail(imagePath);
      if (texture) {
        this.thumbnailCache.set(imagePath, {
          texture,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
        });
        setTimeout(() => this.performThumbnailCacheCleanup(), 0);
      }
      return texture;
    } catch (error) {
      console.error(`Failed to load thumbnail for ${imagePath}:`, error);
      return null;
    }
  }

  private async loadThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    try {
      const thumbnailPixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
        imagePath,
        280,
        200,
        true,
      );
      return thumbnailPixbuf
        ? Gdk.Texture.new_for_pixbuf(thumbnailPixbuf)
        : null;
    } catch (error) {
      console.error(`Failed to load thumbnail for ${imagePath}:`, error);
      return null;
    }
  }

  private performThumbnailCacheCleanup(): void {
    const maxSize = this.maxThumbnailCacheSize.get();
    if (this.thumbnailCache.size <= maxSize) return;

    const entries = Array.from(this.thumbnailCache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed,
    );

    const toDelete = this.thumbnailCache.size - maxSize;
    for (let i = 0; i < toDelete; i++) {
      this.thumbnailCache.delete(entries[i][0]);
    }
  }

  private startPeriodicCleanup(): void {
    this.thumbnailCleanupInterval = setInterval(
      () => {
        this.performThumbnailCacheCleanup();
      },
      10 * 60 * 1000, // 10 minutes
    );
  }

  // Utility Methods
  clearThumbnailCache(): void {
    this.thumbnailCache.clear();
    console.log("Thumbnail cache cleared");
  }

  clearThemeCache(): void {
    this.themeCache.clear();
    options["wallpaper.theme-cache"].value = {};
    console.log("Theme cache cleared");
  }

  dispose(): void {
    console.log("Disposing WallpaperStore");

    if (this.themeDebounceTimer) {
      this.themeDebounceTimer.cancel();
      this.themeDebounceTimer = null;
    }

    this.unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error during unsubscribe:", error);
      }
    });
    this.unsubscribers = [];

    if (this.thumbnailCleanupInterval) {
      clearInterval(this.thumbnailCleanupInterval);
      this.thumbnailCleanupInterval = undefined;
    }

    this.clearThumbnailCache();
    this.clearThemeCache();
  }
}
