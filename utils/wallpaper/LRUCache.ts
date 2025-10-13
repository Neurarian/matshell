export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(private maxSize: number) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.delete(key);

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  updateMaxSize(newMaxSize: number): void {
    this.maxSize = newMaxSize;

    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      } else {
        break;
      }
    }
  }

  toJSON(): Record<string, CacheEntry<T>> {
    const result: Record<string, CacheEntry<T>> = {};
    for (const [key, entry] of this.cache) {
      result[key] = entry;
    }
    return result;
  }

  fromJSON(data: unknown): void {
    this.cache.clear();

    if (!data || typeof data !== "object") {
      console.warn("Invalid cache data, skipping load");
      return;
    }

    const record = data;

    for (const [key, value] of Object.entries(record)) {
      if (this.isValidEntry(value)) {
        this.cache.set(key, value as CacheEntry<T>);
      } else {
        console.warn(`Skipping invalid cache entry: ${key}`);
      }
    }
  }

  private isValidEntry(value: unknown): value is CacheEntry<T> {
    if (!value || typeof value !== "object") {
      return false;
    }

    const entry = value;
    return (
      "value" in entry &&
      "timestamp" in entry &&
      typeof entry.timestamp === "number"
    );
  }
}
