import Gio from "gi://Gio?version=2.0";
import { Gdk } from "ags/gtk4";
import { RssArticle } from "utils/rss/types";

// Core interfaces
export interface BaseItem {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  path?: string;
}

export interface AppItem extends BaseItem {
  kind: "app";
  launch(): void;
}

export interface WallpaperItem extends BaseItem {
  kind: "wallpaper";
  file: Gio.File;
}

export interface ClipboardItem extends BaseItem {
  kind: "clip";
  content: string;
  searchableText?: string; // Fuzzy search optimization
}

export interface RssItem extends RssArticle {
  kind: "rss";
  iconName?: string;
  path?: string;
}

export interface ProviderConfig {
  command: string;
  icon: string;
  name: string;
  placeholder: string;
  component: "list" | "grid";
  maxResults: number;
  features?: Partial<ProviderFeatures>;
  categoryModifier?: { prefix: string };
}

export interface OptionalFeatureMethods<T = PickerItem> {
  refresh?(): Promise<void>;
  random?(): Promise<void>;
  delete?(item: T): Promise<void>;
  wipe?(): Promise<void>;
}

export interface ISearchProvider<
  T = PickerItem,
> extends OptionalFeatureMethods<T> {
  readonly command: string;
  readonly config: ProviderConfig;
  search(query: string): Promise<void>;
  activate(item: T): void;
  dispose?(): void;
  getThumbnail?(imagePath: string): Promise<Gdk.Texture | null>;
}

// Type aliases
export type ProviderFeatures = {
  [K in keyof OptionalFeatureMethods]-?: boolean;
};

export type ComponentType = "list" | "grid";

export type PickerItem = AppItem | WallpaperItem | ClipboardItem | RssItem;
