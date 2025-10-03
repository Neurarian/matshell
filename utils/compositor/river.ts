// utils/compositor/river.ts
import GObject from "gi://GObject";
import River from "gi://AstalRiver";
import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { register } from "ags/gobject";
import { createBinding, createConnection, Accessor } from "ags";
import { CompositorAdapter, Monitor, Workspace, Client } from "./types";

@register({ GTypeName: "RiverAdapter" })
export class RiverAdapter extends GObject.Object implements CompositorAdapter {
  readonly name = "river";
  readonly river: River.River;

  readonly focusedMonitor: Accessor<Monitor | null>;
  readonly monitors: Accessor<Monitor[]>;
  readonly focusedWorkspace: Accessor<Workspace | null>;
  readonly workspaces: Accessor<Workspace[]>;
  readonly focusedClient: Accessor<Client | null>;
  readonly clients: Accessor<Client[]>;

  constructor() {
    super();

    try {
      this.river = River.get_default();
    } catch (error) {
      throw new Error("River not available");
    }

    // Convert River Output to Monitor
    const outputToMonitor = (
      output: River.Output,
      isFocused: boolean,
    ): Monitor => ({
      name: output.get_name(),
      width: output.get_width(),
      height: output.get_height(),
      x: output.get_x(),
      y: output.get_y(),
      focused: isFocused,
      scale: output.get_scale_factor(),
    });

    // Generate workspaces from outputs
    const generateWorkspaces = (outputs: River.Output[]): Workspace[] => {
      const workspaces: Workspace[] = [];

      for (const output of outputs) {
        const focusedTags = output.get_focused_tags();
        const occupiedTags = output.get_occupied_tags();
        const urgentTags = output.get_urgent_tags();

        for (let i = 1; i <= 9; i++) {
          const tagMask = 1 << (i - 1);
          workspaces.push({
            id: tagMask,
            name: String(i),
            focused: (focusedTags & tagMask) !== 0,
            occupied: (occupiedTags & tagMask) !== 0,
            monitor: output.get_name(),
            urgent: (urgentTags & tagMask) !== 0,
          });
        }
      }

      return workspaces;
    };

    const getFocusedWorkspaceFromOutput = (
      output: River.Output,
    ): Workspace | null => {
      const focusedTags = output.get_focused_tags();
      const occupiedTags = output.get_occupied_tags();
      const urgentTags = output.get_urgent_tags();

      for (let i = 1; i <= 9; i++) {
        const tagMask = 1 << (i - 1);
        if (focusedTags & tagMask) {
          return {
            id: tagMask,
            name: String(i),
            focused: true,
            occupied: (occupiedTags & tagMask) !== 0,
            monitor: output.get_name(),
            urgent: (urgentTags & tagMask) !== 0,
          };
        }
      }

      return null;
    };

    // Monitor bindings
    this.focusedMonitor = createBinding(
      this.river,
      "focused-output",
    )((focusedOutputName: string | null): Monitor | null => {
      if (!focusedOutputName) return null;

      const output = this.river
        .get_outputs()
        .find((o) => o.get_name() === focusedOutputName);

      return output ? outputToMonitor(output, true) : null;
    });

    this.monitors = createConnection(
      (() => {
        const outputs = this.river.get_outputs();
        const focusedName = this.river.get_focused_output();
        return outputs.map((output) =>
          outputToMonitor(output, output.get_name() === focusedName),
        );
      })(),
      [
        this.river,
        "changed",
        () => {
          const outputs = this.river.get_outputs();
          const focusedName = this.river.get_focused_output();
          return outputs.map((output) =>
            outputToMonitor(output, output.get_name() === focusedName),
          );
        },
      ],
    );
    // Workspace bindings
    this.workspaces = createConnection(
      generateWorkspaces(this.river.get_outputs()),
      [
        this.river,
        "changed",
        () => generateWorkspaces(this.river.get_outputs()),
      ],
    );

    this.focusedWorkspace = createConnection(
      (() => {
        const focusedOutputName = this.river.get_focused_output();
        if (!focusedOutputName) return null;

        const output = this.river
          .get_outputs()
          .find((o) => o.get_name() === focusedOutputName);

        return output ? getFocusedWorkspaceFromOutput(output) : null;
      })(),
      [
        this.river,
        "changed",
        () => {
          const focusedOutputName = this.river.get_focused_output();
          if (!focusedOutputName) return null;

          const output = this.river
            .get_outputs()
            .find((o) => o.get_name() === focusedOutputName);

          return output ? getFocusedWorkspaceFromOutput(output) : null;
        },
      ],
    );

    // Client bindings
    this.focusedClient = createBinding(
      this.river,
      "focused-view",
    )((focusedView: string | null): Client | null => {
      if (!focusedView) return null;

      return {
        address: "",
        title: focusedView,
        class: "",
        workspace: "",
        monitor: this.river.get_focused_output() || "",
        floating: false,
        fullscreen: false,
        focused: true,
      };
    });

    this.clients = createBinding(
      this.river,
      "focused-view",
    )((): Client[] => []);
  }

  isAvailable(): boolean {
    try {
      return !!this.river;
    } catch {
      return false;
    }
  }

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

  focusWorkspace(id: string | number): void {
    const tagMask = Number(id);

    this.river.run_command_async(
      [`set-focused-tags`, String(tagMask)],
      (success: boolean, msg: string) => {
        if (!success) {
          console.error(`Failed to focus workspace: ${msg}`);
        }
      },
    );
  }

  moveClientToWorkspace(
    clientAddress: string,
    workspaceId: string | number,
  ): void {
    const tagMask = Number(workspaceId);

    this.river.run_command_async(
      [`set-view-tags`, String(tagMask)],
      (success: boolean, msg: string) => {
        if (!success) {
          console.error(`Failed to move client: ${msg}`);
        }
      },
    );
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
