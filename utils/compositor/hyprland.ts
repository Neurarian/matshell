import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import GObject, { register } from "ags/gobject";
import { createBinding, Accessor } from "ags";
import { CompositorAdapter, Monitor, Workspace, Client } from "./types";

// Lazy import
// Type as any since we cant import Hyprland.Hyprland directly
let Hyprland: any = null;
function getHyprland() {
  if (Hyprland !== null) return Hyprland;

  try {
    Hyprland = (globalThis as any).imports.gi.AstalHyprland;
    return Hyprland;
  } catch (error) {
    throw new Error("AstalHyprland library not installed");
  }
}

// Create a unified reactive interface of compositor data to use in components
@register({ GTypeName: "HyprlandAdapter" })
export class HyprlandAdapter
  extends GObject.Object
  implements CompositorAdapter
{
  readonly name = "hyprland";
  // Type as any since we cant import Hyprland.Hyprland directly
  readonly hyprland: any;

  readonly focusedMonitor: Accessor<Monitor | null>;
  readonly monitors: Accessor<Monitor[]>;
  readonly focusedWorkspace: Accessor<Workspace | null>;
  readonly workspaces: Accessor<Workspace[]>;
  readonly focusedClient: Accessor<Client | null>;
  readonly clients: Accessor<Client[]>;

  constructor() {
    super();

    try {
      const HyprlandModule = getHyprland();
      this.hyprland = HyprlandModule.get_default();
    } catch (error) {
      throw new Error("Hyprland not available");
    }

    this.focusedMonitor = createBinding(
      this.hyprland,
      "focused-monitor",
    )((monitor: any | null): Monitor | null => {
      if (!monitor) return null;
      return {
        name: monitor.get_name(),
        width: monitor.get_width(),
        height: monitor.get_height(),
        x: monitor.get_x(),
        y: monitor.get_y(),
        focused: true,
        scale: monitor.get_scale(),
      };
    });

    this.monitors = createBinding(
      this.hyprland,
      "monitors",
    )((monitors: any[]): Monitor[] => {
      return monitors.map((m) => ({
        name: m.get_name(),
        width: m.get_width(),
        height: m.get_height(),
        x: m.get_x(),
        y: m.get_y(),
        focused: m.get_focused(),
        scale: m.get_scale(),
      }));
    });

    this.focusedWorkspace = createBinding(
      this.hyprland,
      "focused-workspace",
    )((workspace: any | null): Workspace | null => {
      if (!workspace) return null;
      return {
        id: workspace.get_id(),
        name: workspace.get_name(),
        focused: true,
        occupied: workspace.get_clients().length > 0,
        monitor: workspace.get_monitor()?.get_name() || "",
      };
    });

    this.workspaces = createBinding(
      this.hyprland,
      "workspaces",
    )((workspaces: any[]): Workspace[] => {
      const focused = this.hyprland.get_focused_workspace();
      return workspaces.map((ws) => ({
        id: ws.get_id(),
        name: ws.get_name(),
        focused: ws === focused,
        occupied: ws.get_clients().length > 0,
        monitor: ws.get_monitor()?.get_name() || "",
      }));
    });

    this.focusedClient = createBinding(
      this.hyprland,
      "focused-client",
    )((client: any | null): Client | null => {
      if (!client) return null;
      return {
        address: client.get_address(),
        title: client.get_title(),
        class: client.get_class(),
        workspace: client.get_workspace()?.get_id() || 0,
        monitor: client.get_monitor()?.get_name() || "",
        floating: client.get_floating(),
        fullscreen: client.get_fullscreen() !== 0,
        focused: true,
      };
    });

    this.clients = createBinding(
      this.hyprland,
      "clients",
    )((clients: any[]): Client[] => {
      const focused = this.hyprland.get_focused_client();
      return clients.map((client) => ({
        address: client.get_address(),
        title: client.get_title(),
        class: client.get_class(),
        workspace: client.get_workspace()?.get_id() || 0,
        monitor: client.get_monitor()?.get_name() || "",
        floating: client.get_floating(),
        fullscreen: client.get_fullscreen() !== 0,
        focused: client === focused,
      }));
    });
  }

  isAvailable(): boolean {
    try {
      return !!this.hyprland;
    } catch {
      return false;
    }
  }

  focusWorkspace(id: string | number): void {
    this.hyprland.dispatch("workspace", String(id));
  }

  matchMonitor(compositorMonitor: Monitor): Gdk.Monitor | null {
    const monitors = app.get_monitors();
    if (!monitors || monitors.length === 0) return null;

    for (let gdkmonitor of monitors) {
      if (
        compositorMonitor &&
        gdkmonitor &&
        compositorMonitor.name === gdkmonitor.get_connector()
      ) {
        return gdkmonitor;
      }
    }

    return monitors.length > 0 ? monitors[0] : null;
  }
}
