import GObject from "ags/gobject";
import GLib from "gi://GLib";
import GdkPixbuf from "gi://GdkPixbuf";
import { Gdk } from "ags/gtk4";
import { Accessor } from "ags";
import { register, signal } from "ags/gobject";
import { ThumbnailRequest, CachedThumbnail } from "./types";
import options from "options";

@register({ GTypeName: "ThumbnailManager" })
export class ThumbnailManager extends GObject.Object {
  private cache = new Map<string, CachedThumbnail>();
  private queue: ThumbnailRequest[] = [];
  private processing = false;
  private maxCacheSize: Accessor<number>;

  @signal([String], GObject.TYPE_NONE, { default: false })
  thumbnailReady(path: string): undefined {}

  constructor() {
    super();
    this.maxCacheSize = options["wallpaper.cache-size"]((c) => Number(c));
  }

  async getThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    // Check cache first
    const cached = this.cache.get(imagePath);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.texture;
    }

    // Add to queue and return promise
    return new Promise((resolve, reject) => {
      this.queue.push({ path: imagePath, resolve, reject });
      this.processQueue();
    });
  }

  hasThumbnail(imagePath: string): boolean {
    return this.cache.has(imagePath);
  }

  getCached(imagePath: string): Gdk.Texture | null {
    const cached = this.cache.get(imagePath);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.texture;
    }
    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;

      try {
        const texture = await this.generateThumbnail(request.path);

        if (texture) {
          this.cacheThumbnail(request.path, texture);
          this.emit("thumbnail-ready", request.path);
        }

        request.resolve(texture);

        // Small delay to prevent UI blocking
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error(
          `Thumbnail generation failed for ${request.path}:`,
          error,
        );
        request.reject(error);
      }
    }

    this.processing = false;
  }

  private async generateThumbnail(
    imagePath: string,
  ): Promise<Gdk.Texture | null> {
    try {
      return await this.generateWithGdkPixbuf(imagePath);
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${imagePath}:`, error);
      return null;
    }
  }

  // Causes minimal blocking, but is much faster than e.g. image magick
  // TODO: Use Glycin instead?
  private async generateWithGdkPixbuf(
    imagePath: string,
  ): Promise<Gdk.Texture | null> {
    return new Promise((resolve) => {
      GLib.idle_add(GLib.PRIORITY_LOW, () => {
        try {
          const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
            imagePath,
            280,
            200,
            true,
          );
          const texture = pixbuf ? Gdk.Texture.new_for_pixbuf(pixbuf) : null;
          resolve(texture);
        } catch (error) {
          console.error(`GdkPixbuf thumbnail generation failed: ${error}`);
          resolve(null);
        }
        return false;
      });
    });
  }

  // Cache management
  private cacheThumbnail(path: string, texture: Gdk.Texture): void {
    this.cache.set(path, {
      texture,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    });

    // Clean up cache if too large
    if (this.cache.size > this.maxCacheSize.get()) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove =
      this.cache.size - Math.floor(this.maxCacheSize.get() * 0.8); // Remove 20%
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}
