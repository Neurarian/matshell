import GObject from "gi://GObject";
import { Gtk, Gdk } from "ags/gtk4";
import { register, property, signal } from "ags/gobject";
import { SearchProviderInstance } from "./SearchProvider.ts";
import { PickerItem, ProviderConfig } from "./types.ts";

@register({ GTypeName: "PickerCoordinator" })
export class PickerCoordinator extends GObject.Object {
  private static instance: PickerCoordinator | null = null;

  @property(String) searchText: string = "";
  @property(String) activeProvider: string = "apps";
  @property(Boolean) isVisible: boolean = false;
  @property(Boolean) hasQuery: boolean = false;
  @property(Boolean) hasResults: boolean = false;
  @property(Boolean) isLoading: boolean = false;
  @property(Array) currentResults: PickerItem[] = [];

  // Reactive UI props
  @property(String) searchIcon: string = "search";
  @property(String) placeholderText: string = "Search...";
  @property(String) providerName: string = "Items";

  private providers = new Map<string, SearchProviderInstance>();
  private providerSignalIds = new Map<string, number[]>();
  private windowRef: Gtk.Window | null = null;
  private searchEntryRef: Gtk.Entry | null = null;

  constructor() {
    super();
  }

  public static getInstance(): PickerCoordinator {
    if (!PickerCoordinator.instance) {
      PickerCoordinator.instance = new PickerCoordinator();
    }
    return PickerCoordinator.instance;
  }

  @signal([String], GObject.TYPE_NONE, { default: false })
  searchCompleted(query: string): undefined {}

  @signal([String], GObject.TYPE_NONE, { default: false })
  providerChanged(provider: string): undefined {}

  @signal([Array], GObject.TYPE_NONE, { default: false })
  resultsChanged(results: PickerItem[]): undefined {}

  addProvider(provider: SearchProviderInstance) {
    this.providers.set(provider.command, provider);

    // Connect to provider signals
    const signalIds: number[] = [];

    const resultsId = provider.connect(
      "results-changed",
      (provider: SearchProviderInstance, results: PickerItem[]) => {
        if (provider.command === this.activeProvider) {
          this.currentResults = results;
          this.hasResults = results.length > 0;
          this.emit("results-changed", results);
        }
      },
    );

    const loadingId = provider.connect(
      "loading-changed",
      (provider: SearchProviderInstance, loading: boolean) => {
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
    }
  }

  get currentProvider(): SearchProviderInstance | undefined {
    return this.providers.get(this.activeProvider);
  }

  get availableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  get firstResult(): PickerItem | null {
    return this.currentResults[0] || null;
  }

  get currentConfig() {
    return this.currentProvider?.config;
  }

  getProviderConfig(command: string): ProviderConfig | undefined {
    const provider = this.providers.get(command);
    return provider?.config;
  }

  setActiveProvider(command: string): boolean {
    if (this.providers.has(command) && this.activeProvider !== command) {
      this.activeProvider = command;
      this.hasResults = this.currentProvider?.hasResults || false;

      // Update reactive UI properties
      const provider = this.currentProvider;
      if (provider?.config) {
        this.searchIcon = provider.config.icon;
        this.placeholderText = provider.config.placeholder;
        this.providerName = provider.config.name;
      }

      this.emit("provider-changed", command);

      this.focusSearch();
      this.clearSearch();
      return true;
    }
    return false;
  }

  async setSearchText(text: string): Promise<void> {
    if (this.searchText !== text) {
      this.searchText = text;
      this.hasQuery = text.trim().length > 0;

      if (this.currentProvider) {
        await this.currentProvider.search(text);
        this.emit("search-completed", text);
      }
    }
  }

  clearSearch(): void {
    this.searchText = "";
    this.hasQuery = false;
    this.hasResults = false;
    this.currentProvider?.search("");
    this.emit("search-completed", "");
  }

  activate(item: PickerItem): void {
    this.currentProvider?.activate(item);
    this.hide();
  }

  activateFirstResult(): boolean {
    const first = this.firstResult;
    if (first) {
      this.activate(first);
      return true;
    }
    return false;
  }

  async refreshCurrentProvider(): Promise<void> {
    const provider = this.currentProvider;
    if (provider?.refresh) {
      await provider.refresh();
      // Re-search after refresh
      await provider.search(this.searchText);
    }
  }

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

  async randomFromCurrentProvider(): Promise<void> {
    const provider = this.currentProvider;
    if (provider?.random) {
      await provider.random();
      return;
    }
    const wallpaperProvider = this.providers.get("wallpapers");

    // set random WP by default
    if (wallpaperProvider?.random) {
      await wallpaperProvider.random();
    }
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

  handleKeyPress(keyval: number): boolean {
    switch (keyval) {
      case Gdk.KEY_Escape:
        this.hide();
        return true;

      case Gdk.KEY_Return:
      case Gdk.KEY_KP_Enter:
        return this.activateFirstResult();

      case Gdk.KEY_Tab:
        const providers = this.availableProviders;
        const currentIndex = providers.indexOf(this.activeProvider);
        const nextProvider = providers[(currentIndex + 1) % providers.length];
        this.setActiveProvider(nextProvider);
        return true;
    }
    return false;
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
}
