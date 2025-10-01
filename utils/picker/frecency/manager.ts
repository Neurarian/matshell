import GObject from "gi://GObject";
import { register, property, signal } from "ags/gobject";
import options from "options";
import type { UsageEntry, FrecencyConfig } from "./types";
import type { PickerItem } from "../types";

@register({ GTypeName: "FrecencyManager" })
export class FrecencyManager extends GObject.Object {
  private static instance: FrecencyManager | null = null;

  @property(Object) config: FrecencyConfig = {
    maxItems: 100,
    decayFactor: 0.9,
    frequencyWeight: 0.7,
    minAccessThreshold: 1,
  };

  @signal([Array], GObject.TYPE_NONE, { default: false })
  frecencyUpdated(entries: UsageEntry[]): undefined {}

  private entries = new Map<string, UsageEntry>();
  private saveTimeout: any;

  constructor() {
    super();
    this.loadFrecencyCache();
  }

  public static getInstance(): FrecencyManager {
    if (!FrecencyManager.instance) {
      FrecencyManager.instance = new FrecencyManager();
    }
    return FrecencyManager.instance;
  }

  // Track item usage
  recordUsage(item: PickerItem, command: string): void {
    const key = this.generateKey(item.id, command);
    const now = Date.now();

    const existing = this.entries.get(key);

    if (existing) {
      // Update existing entry
      existing.frequency = this.calculateDecayedFrequency(existing);
      existing.lastAccessed = now;
      existing.totalAccesses++;
      existing.frecency = this.calculateFrecency(existing);
    } else {
      // Create new entry
      const newEntry: UsageEntry = {
        id: item.id,
        command,
        frequency: 1,
        lastAccessed: now,
        firstAccessed: now,
        totalAccesses: 1,
        // placeholder
        frecency: 0,
      };
      newEntry.frecency = this.calculateFrecency(newEntry);
      this.entries.set(key, newEntry);
    }

    this.scheduleSave();
    this.emit("frecency-updated", Array.from(this.entries.values()));
  }

  // Get frecency-sorted items default items for picker provider
  getDefaultItems(command: string, limit: number = 8): string[] {
    const providerEntries = Array.from(this.entries.values())
      .filter(
        (entry) =>
          entry.command === command &&
          entry.totalAccesses >= this.config.minAccessThreshold,
      )
      .sort((a, b) => b.frecency - a.frecency)
      .slice(0, limit)
      .map((entry) => entry.id);

    return providerEntries;
  }

  private calculateFrecency(entry: UsageEntry): number {
    const now = Date.now();
    const recency =
      Math.max(0, now - entry.lastAccessed) / (1000 * 60 * 60 * 24);
    const frequency = entry.frequency;
    // Exponential decay over 30 days
    const recencyScore = Math.exp(-recency / 30);
    // Log freq scaling
    const frequencyScore = Math.log(frequency + 1);

    return (
      (frequencyScore * this.config.frequencyWeight +
        recencyScore * (1 - this.config.frequencyWeight)) *
      100
    );
  }

  // Apply decay to frequency based on time elapsed
  private calculateDecayedFrequency(entry: UsageEntry): number {
    const now = Date.now();
    const daysSinceLastAccess =
      (now - entry.lastAccessed) / (1000 * 60 * 60 * 24);
    const decayMultiplier = Math.pow(
      this.config.decayFactor,
      daysSinceLastAccess,
    );
    // + 1 for this call
    return Math.max(0.1, entry.frequency * decayMultiplier + 1);
  }

  // Generate unique key for cache entry
  private generateKey(itemId: string, command: string): string {
    return `${command}:${itemId}`;
  }

  private loadFrecencyCache(): void {
    try {
      const cached = options["picker.frecency-cache"].get();
      if (cached) {
        for (const [key, entry] of Object.entries(cached)) {
          // Recalculate frecency in case frecency config has changed
          entry.frecency = this.calculateFrecency(entry);
          this.entries.set(key, entry);
        }
        this.cleanupStaleEntries();
      }
    } catch (error) {
      console.warn("Failed to load frecency cache:", error);
    }
  }

  private saveFrecencyCache(): void {
    try {
      const entriesObject = Object.fromEntries(this.entries);
      options["picker.frecency-cache"].value = entriesObject;
    } catch (error) {
      console.error("Failed to save frecency cache:", error);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    // Debounce chache saves
    this.saveTimeout = setTimeout(() => {
      this.saveFrecencyCache();
      this.saveTimeout = null;
    }, 1000);
  }

  private cleanupStaleEntries(): void {
    const now = Date.now();
    const staleThreshold = 1000 * 60 * 60 * 24 * 90;
    let cleaned = 0;

    for (const [key, entry] of this.entries) {
      if (now - entry.lastAccessed > staleThreshold || entry.frecency < 0.1) {
        this.entries.delete(key);
        cleaned++;
      }
    }

    // Limit total entries
    if (this.entries.size > this.config.maxItems) {
      const sortedEntries = Array.from(this.entries.entries()).sort(
        (a, b) => b[1].frecency - a[1].frecency,
      );

      this.entries.clear();
      sortedEntries
        .slice(0, this.config.maxItems)
        .forEach(([key, entry]) => this.entries.set(key, entry));
    }

    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} stale frecency entries`);
      this.saveFrecencyCache();
    }
  }

  // Public cache management API
  clearCache(): void {
    this.entries.clear();
    this.saveFrecencyCache();
    console.log("Frecency cache cleared");
  }

  dispose(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveFrecencyCache();
    }

    if (FrecencyManager.instance === this) {
      FrecencyManager.instance = null;
    }
  }
}
