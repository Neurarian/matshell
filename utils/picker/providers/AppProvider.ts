import Apps from "gi://AstalApps";
import { register } from "ags/gobject";
import { BaseProvider } from "../SearchProvider";
import { AppItem, ProviderConfig } from "../types";

@register({ GTypeName: "AppProvider" })
export class AppProvider extends BaseProvider {
  readonly config: ProviderConfig = {
    command: "app",
    icon: "Apps",
    name: "Apps",
    placeholder: "Search apps...",
    component: "list",
    maxResults: 8,
  };

  private apps = new Apps.Apps();
  private allApps: AppItem[] = [];

  constructor() {
    super();
    this.command = "app";
    this.loadAllApps();
  }

  private loadAllApps(): void {
    const rawApps = this.apps.get_list() || [];

    // Add a frecency caching ID
    this.allApps = rawApps.map((app) => {
      app.id = this.generateAppId(app);
      return app;
    });
  }

  private generateAppId(app: any): string {
    if (app.executable) {
      const execParts = app.executable.split(" ")[0].split("/");
      const execName = execParts[execParts.length - 1];
      if (execName && execName.length > 1) {
        return execName.toLowerCase();
      }
    }
    return "unknown-app";
  }

  async search(query: string): Promise<void> {
    this.setLoading(true);

    try {
      const trimmedQuery = query.trim();

      if (trimmedQuery.length === 0) {
        // Show frecency
        this.setDefaultResults(this.allApps);
      } else {
        const fuzzyResults = this.apps
          .fuzzy_query(trimmedQuery)
          .slice(0, this.config.maxResults);
        this.setResults(fuzzyResults);
      }
    } finally {
      this.setLoading(false);
    }
  }

  activate(item: AppItem): void {
    item.launch();
  }

  async refresh(): Promise<void> {
    this.loadAllApps();
    if (this.showingDefaults) {
      this.setDefaultResults(this.allApps);
    }
  }
}
