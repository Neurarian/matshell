import { Gdk } from "ags/gtk4";

export interface CachedThumbnail {
  texture: Gdk.Texture;
  timestamp: number;
  lastAccessed: number;
}

export interface ThemeProperties {
  tone: number;
  chroma: number;
  mode: "light" | "dark";
  scheme: "scheme-neutral" | "scheme-vibrant";
}

export interface CachedThemeEntry extends ThemeProperties {
  timestamp: number;
}

export interface ThumbnailRequest {
  path: string;
  resolve: (texture: Gdk.Texture | null) => void;
  reject: (error: any) => void;
}
