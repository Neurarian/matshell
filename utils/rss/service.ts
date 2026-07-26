// TODO: Remove cached items of feeds that aren't tracked anymore
// TODO: Build UI to add and delete feeds, categories & names
import GObject, { register, signal } from "ags/gobject";
import { createState, type Accessor } from "ags";
import { interval, type Timer } from "ags/time";
import { fetch } from "ags/fetch";
import { parseFeedItems } from "./MiniXmlParser.ts";
import { enrichBatch } from "./OpenAlexEnricher.ts";
import type { RssArticle, RssFeedConfig } from "./types.ts";
import options from "../../options";

const CACHE_KEY = "rss_articles";

@register({ GTypeName: "RssService" })
export class RssService extends GObject.Object {
  private static instance: RssService | null = null;

  public static getInstance(): RssService {
    if (!RssService.instance) {
      RssService.instance = new RssService();
    }
    return RssService.instance;
  }

  // Emitted whenever the article list changes (fetch, cache load, refresh)
  @signal([Array], GObject.TYPE_NONE, { default: false })
  articlesUpdated(articles: RssArticle[]): undefined {}

  private articleCache: { data: RssArticle[]; timestamp: number } | null = null;
  private isFetching = false;
  private readonly updateInterval: number;
  private refreshTimer: Timer | null = null;

  // Reactive state, exposed read-only via the `articles` getter
  private readonly articlesState: Accessor<RssArticle[]>;
  private readonly setArticlesState: (articles: RssArticle[]) => void;

  constructor() {
    super();
    this.updateInterval =
      options["rss.refresh-interval-min"].peek() * 60 * 1000;

    const [articles, setArticles] = createState<RssArticle[]>([]);
    this.articlesState = articles;
    this.setArticlesState = setArticles;

    this.loadArticleCache();
    void this.runFetchCycle();

    // interval() runs immediately once and then every `updateInterval` ms
    this.refreshTimer = interval(this.updateInterval, () =>
      this.runFetchCycle(),
    );
  }

  // Public reactive accessor, used by RssProvider.articles.subscribe(...)
  get articles(): Accessor<RssArticle[]> {
    return this.articlesState;
  }

  private safePubDate(raw?: string): number {
    if (!raw) return Date.now();
    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  private loadArticleCache(): void {
    try {
      const persistentCache = options["rss.article-cache"].value;
      const entry = persistentCache[CACHE_KEY];
      if (entry) {
        this.articleCache = entry;
        this.setArticlesState(entry.data);
        this.emit("articles-updated", entry.data);
      }
    } catch (error) {
      console.warn("[RssService] Failed to load cache:", error);
    }
  }

  private saveArticleCache(): void {
    if (!this.articleCache) return;
    try {
      const persistentCache: Record<string, typeof this.articleCache> = {};
      persistentCache[CACHE_KEY] = this.articleCache;
      options["rss.article-cache"].value = persistentCache;
    } catch (error) {
      console.error("[RssService] Failed to save cache:", error);
    }
  }

  private getCachedArticles(): RssArticle[] | null {
    if (!this.articleCache) return null;
    const age = Date.now() - this.articleCache.timestamp;
    const maxAge = this.updateInterval - 5000;
    return age < maxAge ? this.articleCache.data : null;
  }

  private setCachedArticles(data: RssArticle[]): void {
    this.articleCache = {
      data,
      timestamp: Date.now(),
    };
    this.saveArticleCache();
  }

  private extractDOI(entry: Record<string, string>): string | undefined {
    if (entry.doi) return entry.doi;
    const raw = entry.guid || entry.link || "";
    const match = raw.match(/10\.\d{4,9}\/[^\s"<]+/);
    return match ? match[0] : undefined;
  }

  private async fetchOneFeed(feed: RssFeedConfig): Promise<RssArticle[]> {
    const response = await fetch(feed.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    const entries = parseFeedItems(xmlText);

    return entries.map((entry): RssArticle => {
      const doi = this.extractDOI(entry);
      return {
        id: doi ? `doi:${doi}` : `rss:${entry.guid || entry.link}`,
        name: entry.title,
        description: entry.description.slice(0, 200),
        url: entry.link,
        doi,
        pubDate: this.safePubDate(entry.pubDate),
        categories: feed.categories || [],
        searchableText: `${entry.title} ${entry.description}`.toLowerCase(),
      };
    });
  }

  private async fetchAllFeeds(): Promise<RssArticle[]> {
    const feeds = options["rss.feeds"].peek();
    const existing = this.articleCache?.data || [];
    const existingById = new Map(existing.map((a) => [a.id, a]));

    const results = await Promise.allSettled(
      feeds.map((feed: RssFeedConfig) => this.fetchOneFeed(feed)),
    );

    const fetched: RssArticle[] = [];
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        fetched.push(...result.value);
      } else {
        console.error(
          `[RssService] Failed to fetch feed ${feeds[i].name}:`,
          result.reason,
        );
      }
    });

    const combinedById = new Map(existingById);
    for (const article of fetched) {
      const prior = combinedById.get(article.id);
      combinedById.set(
        article.id,
        prior?.enriched !== undefined
          ? { ...prior, categories: article.categories }
          : article,
      );
    }

    const maxAgeDays = options["rss.max-cache-age-days"].peek();
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const pruned = Array.from(combinedById.values()).filter(
      (a) => a.pubDate >= cutoff,
    );

    const enriched = await enrichBatch(pruned);

    this.setCachedArticles(enriched);
    return enriched;
  }

  private async runFetchCycle(force = false): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      if (!force) {
        const cached = this.getCachedArticles();
        if (cached) {
          this.emit("articles-updated", cached);
          return;
        }
      }
      const fresh = await this.fetchAllFeeds();
      this.setArticlesState(fresh);
      this.emit("articles-updated", fresh);
    } catch (err) {
      console.error(`[RssService] ${err}`);
    } finally {
      this.isFetching = false;
    }
  }

  async refresh(): Promise<void> {
    await this.runFetchCycle(true);
  }

  clearCache(): void {
    this.articleCache = null;
  }

  getMaxImpactFactor(): number {
    const current = this.articleCache?.data || [];
    return Math.max(1, ...current.map((a) => a.impactFactor || 0));
  }

  dispose(): void {
    this.refreshTimer?.cancel();
    this.refreshTimer = null;

    if (RssService.instance === this) {
      RssService.instance = null;
    }
  }
}

const rssService = RssService.getInstance();
export default rssService;
