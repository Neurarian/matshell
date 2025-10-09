import Gio from "gi://Gio?version=2.0";
import { Gdk } from "ags/gtk4";

// Core interfaces
export interface BaseItem {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  path?: string;
}

export interface AppItem extends BaseItem {
  launch(): void;
}

export interface WallpaperItem extends BaseItem {
  file: Gio.File;
}

export interface ClipboardItem extends BaseItem {
  content: string;
  searchableText?: string; // Fuzzy search optimization
}

export interface ProviderConfig {
  command: string;
  icon: string;
  name: string;
  placeholder: string;
  component: "list" | "grid";
  maxResults: number;
  features?: {
    refresh?: boolean;
    random?: boolean;
    delete?: boolean;
    wipe?: boolean;
  };
}

export interface ISearchProvider<T = PickerItem> {
  readonly command: string;
  readonly config: ProviderConfig;
  search(query: string): Promise<void>;
  activate(item: T): void;
  dispose?(): void;
  refresh?(): Promise<void>;
  random?(): Promise<void>;
  delete?(item: T): Promise<void>;
  wipe?(): Promise<void>;
  getThumbnail?(imagePath: string): Promise<Gdk.Texture | null>;
}

// Type aliases

export type ComponentType = "list" | "grid";

export type PickerItem = AppItem | WallpaperItem | ClipboardItem;
