import Apps from "gi://AstalApps";
import { register } from "ags/gobject";
import { BaseProvider } from "../SearchProvider.ts";
import { AppItem, ProviderConfig, ISearchProvider } from "../types.ts";

@register({ GTypeName: "AppProvider" })
export class AppProvider
  extends BaseProvider
  implements ISearchProvider<AppItem>
{
  readonly config: ProviderConfig = {
    command: "apps",
    icon: "Apps",
    name: "Apps",
    placeholder: "Search apps...",
    component: "list",
    maxResults: 8,
  };

  private apps = new Apps.Apps();

  constructor() {
    super();
    this.command = "apps";
  }

  async search(query: string): Promise<void> {
    this.setLoading(true);

    try {
      if (query.trim().length === 0) {
        this.setResults([]);
        return;
      }

      const results = this.apps
        .fuzzy_query(query)
        .slice(0, this.config.maxResults);
      this.setResults(results);
    } finally {
      this.setLoading(false);
    }
  }

  activate(item: AppItem): void {
    item.launch();
  }
}
