// providers/RssProvider.ts
import Gio from "gi://Gio?version=2.0";
import { register } from "ags/gobject";
import { BaseProvider } from "../SearchProvider.ts";
import { RssItem, ProviderConfig } from "../types.ts";
import { RssArticle } from "utils/rss/types.ts";
import rssService from "utils/rss/service.ts";
import { rankResults } from "utils/rss/ranking.ts";
import Fuse from "utils/fuse.js";
import options from "options";

@register({ GTypeName: "RssProvider" })
export class RssProvider extends BaseProvider {
  readonly config: ProviderConfig = {
    command: "rss",
    icon: "Rss_Feed",
    name: "Feed",
    placeholder: "Search articles... (#category to filter)",
    component: "list",
    maxResults: 10,
    features: { refresh: true },
    categoryModifier: { prefix: "#" },
  };

  private signalId: number | null = null;
  private lastQuery = "";

  constructor() {
    super();
    this.command = "rss";

    this.signalId = rssService.connect("articles-updated", () => {
      if (this.active) {
        void this.search(this.lastQuery);
      }
    });
  }

  private toRssItems(articles: RssArticle[]): RssItem[] {
    return articles.map((a) => ({ ...a, kind: "rss" as const }));
  }

  async search(query: string): Promise<void> {
    this.lastQuery = query;
    this.setLoading(true);
    try {
      const allItems = this.toRssItems(rssService.articles.peek());
      if (query.trim().length === 0) {
        this.setDefaultResults(allItems);
        return;
      }

      const { category, term } = this.extractCategory(query);
      let pool = allItems;
      if (category) {
        pool = pool.filter((article) => article.categories?.includes(category));
      }
      if (term.trim().length === 0) {
        this.setResults(pool.slice(0, this.config.maxResults));
        return;
      }

      const fuseResults: { item: RssItem; score?: number }[] = new Fuse(pool, {
        keys: [
          { name: "name", weight: 0.6 },
          { name: "searchableText", weight: 0.4 },
        ],
        includeScore: true,
        threshold: 0.45,
        ignoreLocation: true,
      }).search(term);

      const impactWeight = options["rss.impact-weight"].peek();
      const maxImpact = rssService.getMaxImpactFactor();

      const ranked = rankResults<RssItem>(fuseResults, impactWeight, maxImpact);
      this.setResults(
        ranked.slice(0, this.config.maxResults).map((r) => r.item),
      );
    } finally {
      this.setLoading(false);
    }
  }
  async refresh(): Promise<void> {
    await rssService.refresh();
    await this.search(this.lastQuery ?? "");
  }

  activate(item: RssItem): void {
    Gio.AppInfo.launch_default_for_uri(item.url, null);
  }

  dispose(): void {
    if (this.signalId !== null) {
      rssService.disconnect(this.signalId);
      this.signalId = null;
    }
  }
}
