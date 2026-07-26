import GObject, { register, property, signal } from "ags/gobject";
import { PickerItem, ISearchProvider } from "./types";
import { FrecencyManager } from "./frecency/manager.ts";
import {
  ProviderConfig,
  ProviderFeatures,
  OptionalFeatureMethods,
} from "./types";
import { parsePrefixModifier } from "utils/query.ts";

export type SearchProvider = BaseProvider & ISearchProvider;

@register({ GTypeName: "BaseProvider" })
export class BaseProvider extends GObject.Object {
  @property(Array) results: PickerItem[] = [];
  @property(Array) defaultResults: PickerItem[] = []; // Frecency-based defaults
  @property(Boolean) isLoading: boolean = false;
  @property(String) command: string = "";
  @property(Boolean) showingDefaults: boolean = false; // Track current mode
  @property(Boolean) active: boolean = false;

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
  get hasResults(): boolean {
    return this.results.length > 0;
  }

  get hasDefaults(): boolean {
    return this.defaultResults.length > 0;
  }

  get features(): ProviderFeatures {
    const self = this as OptionalFeatureMethods;
    return {
      refresh: typeof self.refresh === "function",
      random: typeof self.random === "function",
      delete: typeof self.delete === "function",
      wipe: typeof self.wipe === "function",
    };
  }

  protected extractCategory(query: string): {
    category?: string;
    term: string;
  } {
    const mod = this.providerConfig?.categoryModifier;
    if (!mod) return { term: query };

    const { token, term } = parsePrefixModifier(query, mod.prefix);
    return { category: token?.toLowerCase(), term };
  }

  setResults(results: PickerItem[]) {
    this.updateResults(results);
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
    this.updateResults(defaults);
  }

  clearResults() {
    this.updateResults([]);
  }

  setLoading(loading: boolean) {
    if (this.isLoading !== loading) {
      this.isLoading = loading;
      this.emit("loading-changed", loading);
    }
  }

  setActive(active: boolean) {
    this.active = active;
  }

  recordActivation(item: PickerItem) {
    this.frecencyManager.recordUsage(item, this.command);
  }

  complete(text: string): string {
    const matches = this.results.filter((item) =>
      item.name?.toLowerCase().startsWith(text.toLowerCase()),
    );
    return matches[0]?.name || text;
  }

  private updateResults(results: PickerItem[], showingDefaults = false) {
    this.results = results;
    this.showingDefaults = showingDefaults;
    this.emit("results-changed", results);
  }
}
