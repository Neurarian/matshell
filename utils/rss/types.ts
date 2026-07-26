export interface RssFeedConfig {
  url: string;
  name: string;
  categories: string[];
}

export interface RssArticle {
  id: string;
  name: string;
  description: string;
  url: string;
  doi?: string;
  journalName?: string;
  impactFactor?: number;
  citationCount?: number;
  pubDate: number;
  categories: string[];
  enriched?: boolean;
  searchableText: string;
  sourceId?: string;
  impactFactorUpdated?: number;
}
