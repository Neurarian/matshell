import GObject from "gi://GObject";
import { register, property, signal } from "ags/gobject";
import { PickerItem, ISearchProvider } from "./types";

export type SearchProviderInstance<T = PickerItem> = BaseProvider &
  ISearchProvider<T>;

@register({ GTypeName: "BaseProvider" })
export class BaseProvider extends GObject.Object {
  @property(Array) results: any[] = [];
  @property(Boolean) isLoading: boolean = false;
  @property(String) command: string = "";

  @signal([Array], GObject.TYPE_NONE, { default: false })
  resultsChanged(results: any[]): undefined {}

  @signal([Boolean], GObject.TYPE_NONE, { default: false })
  loadingChanged(loading: boolean): undefined {}

  setResults(results: PickerItem[]) {
    this.results = results;
    this.emit("results-changed", results);
  }

  setLoading(loading: boolean) {
    if (this.isLoading !== loading) {
      this.isLoading = loading;
      this.emit("loading-changed", loading);
    }
  }

  get firstResult(): PickerItem | null {
    return this.results.length > 0 ? this.results[0] : null;
  }

  get hasResults(): boolean {
    return this.results.length > 0;
  }
}
