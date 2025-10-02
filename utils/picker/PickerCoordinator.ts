import GObject from "gi://GObject";
import { Gtk, Gdk } from "ags/gtk4";
import { register, property, signal } from "ags/gobject";
import { SearchProvider } from "./SearchProvider.ts";
import { PickerItem, ProviderConfig } from "./types.ts";
import { FrecencyManager } from "./frecency/manager.ts";

@register({ GTypeName: "PickerCoordinator" })
export class PickerCoordinator extends GObject.Object {
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

  @signal([String], GObject.TYPE_NONE, { default: false })
  providerChanged(provider: string): undefined {}

  @signal([Array], GObject.TYPE_NONE, { default: false })
  resultsChanged(results: PickerItem[]): undefined {}

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
      setTimeout(() => {
        provider.search("");
      }, 0);
    }
  }

  get currentProvider(): SearchProvider | undefined {
    return this.providers.get(this.activeProvider);
  }

  get availableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  get selectedResult(): PickerItem | null {
    return this.currentResults[this.selectedIndex] || null;
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
      this.resetSelection();

      // Update reactive UI properties
      const provider = this.currentProvider;
      if (provider?.config) {
        this.searchIcon = provider.config.icon;
        this.placeholderText = provider.config.placeholder;
        this.providerName = provider.config.name;
      }

      this.emit("provider-changed", command);
      this.focusSearch();
      this.searchText = "";
      this.hasQuery = false;

      //  Trigger empty search to show defaults
      if (provider) {
        setTimeout(() => {
          provider.search("").then(() => {
            this.hasResults = provider.hasResults;
          });
        }, 0);
      }

      return true;
    }
    return false;
  }

  private parseInput(text: string): { command: string; query: string } {
    // Support switch of providers via :command like gnofi in addition to tab switching
    if (text.startsWith(":")) {
      const spaceIndex = text.indexOf(" ");
      return {
        command: spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex),
        query: spaceIndex === -1 ? "" : text.slice(spaceIndex + 1),
      };
    }

    // Fall back to current active provider
    return { command: this.activeProvider, query: text };
  }

  async setSearchText(text: string): Promise<void> {
    if (this.searchText !== text) {
      this.searchText = text;
      this.hasQuery = text.trim().length > 0;
      this.resetSelection();
      const { command, query } = this.parseInput(text);

      if (this.providers.has(command) && command !== this.activeProvider) {
        this.setActiveProvider(command);
      }
      if (this.currentProvider) {
        await this.currentProvider.search(query);
      }
    }
  }

  clearSearch(): void {
    this.searchText = "";
    this.hasQuery = false;

    // Show updated defaults instead of clearing everything
    if (this.currentProvider) {
      this.currentProvider.search("").then(() => {
        this.hasResults = this.currentProvider?.hasResults || false;
      });
    }
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

  showDefaults(): void {
    const provider = this.currentProvider;
    if (provider && provider.hasDefaults) {
      this.currentResults = provider.defaultResults;
      this.hasResults = true;
      this.emit("results-changed", provider.defaultResults);
    }
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

  async refresh(): Promise<void> {
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

  async random(
    command: string | undefined = this.currentProvider?.config.command,
  ): Promise<void> {
    if (command) {
      const provider = this.providers.get(command);
      if (provider?.random) await provider?.random();
      return;
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
        const selected = this.selectedResult;
        if (selected) {
          this.activate(selected);
          return true;
        }
        return false;

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
