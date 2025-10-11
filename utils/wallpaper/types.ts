import { Gdk } from "ags/gtk4";

export interface CachedThumbnail {
  texture: Gdk.Texture;
  timestamp: number;
  lastAccessed: number;
}

export const THEME_MODE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export const THEME_SCHEME_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "scheme-tonal-spot", label: "Tonal Spot" },
  { value: "scheme-vibrant", label: "Vibrant" },
  { value: "scheme-neutral", label: "Neutral" },
  { value: "scheme-expressive", label: "Expressive" },
  { value: "scheme-monochrome", label: "Monochrome" },
  { value: "scheme-fidelity", label: "Fidelity" },
  { value: "scheme-content", label: "Content" },
  { value: "scheme-rainbow", label: "Rainbow" },
  { value: "scheme-fruit-salad", label: "Fruit Salad" },
] as const;

export type ThemeMode = (typeof THEME_MODE_OPTIONS)[number]["value"];
export type ThemeScheme = (typeof THEME_SCHEME_OPTIONS)[number]["value"];

export interface ThemeProperties {
  tone: number;
  chroma: number;
  mode: ThemeMode;
  scheme: ThemeScheme;
}

export interface ThumbnailRequest {
  path: string;
  resolve: (texture: Gdk.Texture | null) => void;
  reject: (error: any) => void;
}
