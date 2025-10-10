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

  fromJSON(data: Record<string, CacheEntry<T>>): void {
    this.cache.clear();
    for (const [key, entry] of Object.entries(data)) {
      this.cache.set(key, entry);
    }
  }
}
