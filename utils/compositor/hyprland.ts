// utils/compositor/hyprland.ts
import GObject from "gi://GObject";
import Hyprland from "gi://AstalHyprland";
import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { register, property } from "ags/gobject";
import { createBinding, Accessor } from "ags";
import { CompositorAdapter, Monitor, Workspace, Client } from "./types";

@register({ GTypeName: "HyprlandAdapter" })
export class HyprlandAdapter
  extends GObject.Object
  implements CompositorAdapter
{
  readonly name = "hyprland";
  readonly hyprland: Hyprland.Hyprland;

  // Create reactive bindings directly to AstalHyprland
  readonly focusedMonitor: Accessor<Monitor | null>;
  readonly monitors: Accessor<Monitor[]>;
  readonly focusedWorkspace: Accessor<Workspace | null>;
  readonly workspaces: Accessor<Workspace[]>;
  readonly focusedClient: Accessor<Client | null>;
  readonly clients: Accessor<Client[]>;

  constructor() {
    super();

    try {
      this.hyprland = Hyprland.get_default();
    } catch (error) {
      throw new Error("Hyprland not available");
    }

    // Create reactive bindings that transform AstalHyprland data to our interface
    this.focusedMonitor = createBinding(
      this.hyprland,
      "focused-monitor",
    )((monitor: Hyprland.Monitor | null): Monitor | null => {
      if (!monitor) return null;

      // Verify monitor still exists
      try {
        const name = monitor.get_name();
        if (!name) return null;

        return {
          name: name,
          width: monitor.get_width(),
          height: monitor.get_height(),
          x: monitor.get_x(),
          y: monitor.get_y(),
          focused: true,
          scale: monitor.get_scale(),
        };
      } catch (error) {
        console.warn("Monitor no longer available:", error);
        return null;
      }
    });
    this.monitors = createBinding(
      this.hyprland,
      "monitors",
    )((monitors: Hyprland.Monitor[]): Monitor[] => {
      // Filter out invalid monitors
      return monitors
        .filter((m) => {
          try {
            return m && m.get_name();
          } catch {
            return false;
          }
        })
        .map((m) => ({
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
    )((workspace: Hyprland.Workspace | null): Workspace | null => {
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
    )((workspaces: Hyprland.Workspace[]): Workspace[] => {
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
    )((client: Hyprland.Client | null): Client | null => {
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
    )((clients: Hyprland.Client[]): Client[] => {
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

  // Simple getter methods that use the bindings' current values
  getMonitors(): Monitor[] {
    return this.monitors.get();
  }

  getFocusedMonitor(): Monitor | null {
    return this.focusedMonitor.get();
  }

  getWorkspaces(): Workspace[] {
    return this.workspaces.get();
  }

  getFocusedWorkspace(): Workspace | null {
    return this.focusedWorkspace.get();
  }

  getClients(): Client[] {
    return this.clients.get();
  }

  getFocusedClient(): Client | null {
    return this.focusedClient.get();
  }

  // Actions - direct passthrough to Hyprland
  focusWorkspace(id: string | number): void {
    this.hyprland.dispatch("workspace", String(id));
  }

  moveClientToWorkspace(
    clientAddress: string,
    workspaceId: string | number,
  ): void {
    this.hyprland.dispatch(
      "movetoworkspacesilent",
      `${workspaceId},address:${clientAddress}`,
    );
  }

  // GDK Monitor matching
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
