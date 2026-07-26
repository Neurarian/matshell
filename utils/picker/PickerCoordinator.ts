import GObject from "ags/gobject";
import { Gtk, Gdk } from "ags/gtk4";
import { register, property, signal } from "ags/gobject";
import { SearchProvider } from "./SearchProvider.ts";
import { PickerItem, ProviderConfig } from "./types.ts";
import { FrecencyManager } from "./frecency/manager.ts";
import { ParsedModifier, parsePrefixModifier } from "utils/query.ts";

@register({ GTypeName: "PickerCoordinator" })
export class PickerCoordinator extends GObject.Object {
  // Class fields & properties
  private static instance: PickerCoordinator | null = null;

  @property(String) searchText: string = "";
  @property(String) activeProvider: string = "app";
  @property(Boolean) isVisible: boolean = false;
  @property(Boolean) hasQuery: boolean = false;
  @property(Boolean) hasResults: boolean = false;
  @property(Boolean) isLoading: boolean = false;
  @property(Array) currentResults: PickerItem[] = [];
  @property(Number) selectedIndex: number = 0;
  @property(Boolean) hasNavigated: boolean = false;

  // Reactive UI props
  @property(String) searchIcon: string = "search";
  @property(String) placeholderText: string = "Search...";
  @property(String) providerName: string = "Items";

  private providers = new Map<string, SearchProvider>();
  private providerSignalIds = new Map<string, number[]>();
  private windowRef: Gtk.Window | null = null;
  private searchEntryRef: Gtk.Entry | null = null;
  private frecencyManager: FrecencyManager;

  constructor() {
    super();
    this.frecencyManager = FrecencyManager.getInstance();
  }

  public static getInstance(): PickerCoordinator {
    if (!PickerCoordinator.instance) {
      PickerCoordinator.instance = new PickerCoordinator();
    }
    return PickerCoordinator.instance;
  }

  // Signals
  @signal([String], GObject.TYPE_NONE, { default: false })
  providerChanged(provider: string): undefined {}

  @signal([Array], GObject.TYPE_NONE, { default: false })
  resultsChanged(results: PickerItem[]): undefined {}

  // Provider registry
  addProvider(provider: SearchProvider) {
    this.providers.set(provider.command, provider);

    // Connect to provider signals
    const signalIds: number[] = [];

    const resultsId = provider.connect(
      "results-changed",
      (provider: SearchProvider, results: PickerItem[]) => {
        if (provider.command === this.activeProvider) {
          this.currentResults = results;
          this.hasResults = results.length > 0;
          this.emit("results-changed", results);
        }
      },
    );

    const loadingId = provider.connect(
      "loading-changed",
      (provider: SearchProvider, loading: boolean) => {
        if (provider.command === this.activeProvider) {
          this.isLoading = loading;
        }
      },
    );

    signalIds.push(resultsId, loadingId);
    this.providerSignalIds.set(provider.command, signalIds);

    if (provider.command === this.activeProvider) {
      this.searchIcon = provider.config.icon;
      this.placeholderText = provider.config.placeholder;
      this.providerName = provider.config.name;

      // Trigger initial display of frecency defaults after provider connects
      void this.showDefaultsFor(provider);
    }
  }

  dispose(): void {
    for (const [command, signalIds] of this.providerSignalIds) {
      const provider = this.providers.get(command);
      if (provider) {
        signalIds.forEach((id) => provider.disconnect(id));
      }
    }
    this.providerSignalIds.clear();

    for (const provider of this.providers.values()) {
      provider.dispose?.();
    }
    this.providers.clear();

    if (PickerCoordinator.instance === this) {
      PickerCoordinator.instance = null;
    }
  }

  get currentProvider(): SearchProvider | undefined {
    return this.providers.get(this.activeProvider);
  }

  get availableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderConfig(command: string): ProviderConfig | undefined {
    const provider = this.providers.get(command);
    return provider?.config;
  }

  get currentConfig() {
    return this.currentProvider?.config;
  }

  // Provider switching
  private activateProvider(command: string): SearchProvider | undefined {
    if (!this.providers.has(command) || this.activeProvider === command) {
      return this.currentProvider;
    }
    this.activeProvider = command;
    this.resetSelection();

    const provider = this.currentProvider;
    if (provider?.config) {
      this.searchIcon = provider.config.icon;
      this.placeholderText = provider.config.placeholder;
      this.providerName = provider.config.name;
      provider.setActive(true);
    }
    this.emit("provider-changed", command);
    return provider;
  }

  setActiveProvider(command: string): boolean {
    const provider = this.activateProvider(command);
    if (!provider) return false;

    this.focusSearch();
    this.searchText = "";
    this.hasQuery = false;
    void this.showDefaultsFor(provider);
    return true;
  }

  // Search
  async setSearchText(text: string): Promise<void> {
    if (this.searchText === text) return;

    const { token, term } = parsePrefixModifier(text, ":");
    const isProviderCommand = token !== null && this.providers.has(token);

    if (isProviderCommand) {
      this.activateProvider(token);
      this.searchText = term;
    } else {
      this.searchText = text;
    }

    this.hasQuery = this.searchText.trim().length > 0;
    this.resetSelection();

    await this.currentProvider?.search(term);
  }

  clearSearch(): void {
    this.searchText = "";
    this.hasQuery = false;

    // Show updated defaults instead of clearing everything
    if (this.currentProvider) {
      void this.showDefaultsFor(this.currentProvider);
    }
  }

  private async showDefaultsFor(provider: SearchProvider): Promise<void> {
    await provider.search("");
    if (provider.command === this.activeProvider) {
      this.hasResults = provider.hasResults;
    }
  }

  showDefaults(): void {
    const provider = this.currentProvider;
    if (provider && provider.hasDefaults) {
      this.currentResults = provider.defaultResults;
      this.hasResults = true;
      this.emit("results-changed", provider.defaultResults);
    }
  }

  async refresh(): Promise<void> {
    const provider = this.currentProvider;
    if (provider?.refresh) {
      await provider.refresh();
      // Re-search after refresh
      await provider.search(this.searchText);
    }
  }

  // Selection / navigation
  private resetSelection(): void {
    this.selectedIndex = 0;
    this.hasNavigated = false;
  }

  private moveSelection(direction: 1 | -1): boolean {
    if (this.currentResults.length === 0) return false;
    // First navigation edge case
    if (!this.hasNavigated) {
      this.hasNavigated = true;
      return true;
    }

    const newIndex = this.selectedIndex + direction;

    // Wrap around navigation
    if (newIndex < 0) {
      this.selectedIndex = this.currentResults.length - 1;
    } else if (newIndex >= this.currentResults.length) {
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = newIndex;
    }

    return true;
  }

  get selectedResult(): PickerItem | null {
    return this.currentResults[this.selectedIndex] || null;
  }

  // First result by default
  activateSelectedResult(): boolean {
    const selected = this.selectedResult;
    if (selected) {
      this.activate(selected);
      return true;
    }
    return false;
  }

  activate(item: PickerItem): void {
    const provider = this.currentProvider;
    if (provider) {
      // Record activation for frecency
      provider.recordActivation(item);
      provider.activate(item);
    }
    this.hide();
  }

  // Provider feature passthrough
  async delete(item: PickerItem): Promise<void> {
    const provider = this.currentProvider;
    if (provider?.delete) {
      await provider.delete(item);
    }
  }

  async wipe(): Promise<void> {
    const provider = this.currentProvider;
    if (provider?.wipe) {
      await provider.wipe();
    }
  }

  async random(): Promise<void> {
    await this.currentProvider?.random?.();
  }

  async getThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    const provider = this.currentProvider;

    if (provider?.getThumbnail) {
      return await provider.getThumbnail(imagePath);
    }

    return null;
  }

  // Window management
  set window(window: Gtk.Window | null) {
    this.windowRef = window;
  }

  set searchEntry(entry: Gtk.Entry | null) {
    this.searchEntryRef = entry;
  }

  show(): void {
    if (this.windowRef) {
      this.isVisible = true;
      this.windowRef.show();
      this.focusSearch();
    }
  }

  hide(): void {
    if (this.windowRef) {
      this.isVisible = false;
      this.windowRef.hide();
    }
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  focusSearch(): void {
    if (this.searchEntryRef) {
      this.searchEntryRef.grab_focus();
    }
  }

  // Input handling
  handleKeyPress({
    key,
    controlMod,
  }: {
    key: number;
    controlMod?: boolean;
  }): boolean {
    switch (key) {
      case Gdk.KEY_Escape:
        this.hide();
        return true;

      case Gdk.KEY_KP_Enter:
        return this.activateSelectedResult();

      case Gdk.KEY_Tab:
        if (this.hasQuery) {
          const completed = this.currentProvider?.complete(this.searchText);
          if (completed && completed !== this.searchText) {
            this.setSearchText(completed);
            if (this.searchEntryRef) {
              this.searchEntryRef.set_position(-1);
            }
            this.focusSearch();
            return true;
          }
          return true;
        }
        const providers = this.availableProviders;
        const currentIndex = providers.indexOf(this.activeProvider);
        const nextProvider = providers[(currentIndex + 1) % providers.length];
        this.setActiveProvider(nextProvider);
        return true;

      case Gdk.KEY_n:
      case Gdk.KEY_N:
        if (controlMod) {
          return this.moveSelection(1);
        }
        return false;

      case Gdk.KEY_p:
      case Gdk.KEY_P:
        if (controlMod) {
          return this.moveSelection(-1);
        }
        return false;

      case Gdk.KEY_Down:
        return this.moveSelection(1);

      case Gdk.KEY_Up:
        return this.moveSelection(-1);
    }

    return false;
  }
}
