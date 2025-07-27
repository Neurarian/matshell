
import Notifd from "gi://AstalNotifd";

export interface UnifiedNotification {
  id: number;
  appName: string;
  summary: string;
  body?: string;
  appIcon?: string;
  image?: string;
  desktopEntry?: string;
  time: number;
  actions: Array<{ label: string; action: string }>;
  urgency: Notifd.Urgency;
  dismissed?: boolean;
  seen?: boolean;
}

export interface StoredNotification {
  id: number;
  appName: string;
  summary: string;
  body?: string;
  appIcon?: string;
  image?: string;
  desktopEntry?: string;
  time: number;
  actions: Array<{ label: string; action: string }>;
  urgency: Notifd.Urgency;
  dismissed: boolean;
  seen: boolean;
}

export type TimeoutManager = {
  setupTimeout: () => void;
  clearTimeout: () => void;
  handleHover: () => void;
  handleHoverLost: () => void;
  cleanup: () => void;
};
