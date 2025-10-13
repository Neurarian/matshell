import Notifd from "gi://AstalNotifd";

interface BaseNotification {
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
}

// Stored in NotificationManager
export interface StoredNotification extends BaseNotification {
  seen: boolean;
}

// Accepts both live and stored
export interface DisplayNotification extends BaseNotification {
  seen?: boolean;
  dismissed?: boolean;
}

export type TimeoutManager = {
  setupTimeout: () => void;
  clearTimeout: () => void;
  handleHover: () => void;
  handleHoverLost: () => void;
  cleanup: () => void;
};
