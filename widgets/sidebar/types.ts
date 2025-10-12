export interface WidgetDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  component: () => JSX.Element;
  separatorAfter: boolean;
  canDisable: boolean;
}

export type SidebarWidgetId =
  | "clock"
  | "weather"
  | "settings"
  | "hardware"
  | "notes";

export const DEFAULT_WIDGET_ORDER: SidebarWidgetId[] = [
  "clock",
  "weather",
  "settings",
  "hardware",
  "notes",
];

export const DEFAULT_ENABLED_WIDGETS: SidebarWidgetId[] = [
  "clock",
  "weather",
  "settings",
  "hardware",
];
