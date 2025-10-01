// Caching type
export interface UsageEntry {
  id: string;
  // provider command
  command: string;
  frequency: number;
  lastAccessed: number;
  firstAccessed: number;
  totalAccesses: number;
  frecency: number;
}

export interface FrecencyConfig {
  maxItems: number;
  decayFactor: number;
  frequencyWeight: number;
  minAccessThreshold: number;
}
