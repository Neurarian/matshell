// utils/compositor/types.ts
import { Gdk } from "ags/gtk4";
import { Accessor } from "ags";

export interface Monitor {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  focused: boolean;
  scale?: number;
}

export interface Workspace {
  id: number | string;
  name: string;
  focused: boolean;
  occupied: boolean;
  monitor: string;
  urgent?: boolean;
}

export interface Client {
  address: string;
  title: string;
  class: string;
  workspace: string | number;
  monitor: string;
  floating: boolean;
  fullscreen: boolean;
  focused: boolean;
}

export interface CompositorAdapter {
  readonly name: string;

  readonly focusedMonitor: Accessor<Monitor | null>;
  readonly monitors: Accessor<Monitor[]>;
  readonly focusedWorkspace: Accessor<Workspace | null>;
  readonly workspaces: Accessor<Workspace[]>;
  readonly focusedClient: Accessor<Client | null>;
  readonly clients: Accessor<Client[]>;

  isAvailable(): boolean;

  // Actions
  focusWorkspace(id: string | number): void;
  // GDK Monitor matching
  matchMonitor(compositorMonitor: Monitor): Gdk.Monitor | null;
}
