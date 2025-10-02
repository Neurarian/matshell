import GObject from "gi://GObject";
import { register, property, signal } from "ags/gobject";
import { PickerItem, ISearchProvider } from "./types";
import { FrecencyManager } from "./frecency/manager.ts";
import { ProviderConfig } from "./types";

export type SearchProvider<T = PickerItem> = BaseProvider & ISearchProvider<T>;

@register({ GTypeName: "BaseProvider" })
export class BaseProvider extends GObject.Object {
  @property(Array) results: PickerItem[] = [];
  @property(Array) defaultResults: PickerItem[] = []; // Frecency-based defaults
  @property(Boolean) isLoading: boolean = false;
  @property(String) command: string = "";
  @property(Boolean) showingDefaults: boolean = false; // Track current mode

  protected frecencyManager: FrecencyManager;

  @signal([Array], GObject.TYPE_NONE, { default: false })
  resultsChanged(results: any[]): undefined {}

  @signal([Boolean], GObject.TYPE_NONE, { default: false })
  loadingChanged(loading: boolean): undefined {}

  constructor() {
    super();
    this.frecencyManager = FrecencyManager.getInstance();
  }

  protected get providerConfig(): ProviderConfig {
    return (this as this & { config: ProviderConfig }).config;
  }

  setResults(results: PickerItem[]) {
    this.results = results;
    this.showingDefaults = false;
    this.emit("results-changed", results);
  }

  // Results based on frecency when no search query
  setDefaultResults(allItems: PickerItem[]) {
    const maxResults = this.providerConfig?.maxResults;
    const frecencyIds = this.frecencyManager.getDefaultItems(
      this.command,
      maxResults,
    );
    const defaults = frecencyIds
      .map((id) => allItems.find((item) => item.id === id))
      .filter(Boolean) as PickerItem[];

    this.defaultResults = defaults;
    this.results = defaults;
    this.showingDefaults = true;
    this.emit("results-changed", defaults);
  }

  clearResults() {
    this.results = [];
    this.showingDefaults = false;
    this.emit("results-changed", []);
  }

  setLoading(loading: boolean) {
    if (this.isLoading !== loading) {
      this.isLoading = loading;
      this.emit("loading-changed", loading);
    }
  }

  complete(text: string): string {
    const matches = this.results.filter((item) =>
      item.name?.toLowerCase().startsWith(text.toLowerCase()),
    );
    return matches[0]?.name || text;
  }

  recordActivation(item: PickerItem) {
    this.frecencyManager.recordUsage(item, this.command);
  }

  get hasResults(): boolean {
    return this.results.length > 0;
  }

  get hasDefaults(): boolean {
    return this.defaultResults.length > 0;
  }
}
