import GObject from "gi://GObject";
import { Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { register } from "ags/gobject";
import { createBinding, createConnection, Accessor } from "ags";
import { CompositorAdapter, Monitor, Workspace, Client } from "./types";

// Lazy import
// Type as any since we cant import River.River directly
let River: any = null;
function getRiver() {
  if (River !== null) return River;
  try {
    River = (globalThis as any).imports.gi.AstalRiver;
    return River;
  } catch (error) {
    throw new Error("AstalRiver library not installed");
  }
}

// Convert River Output to Monitor
function outputToMonitor(output: any, isFocused: boolean): Monitor {
  return {
    name: output.get_name(),
    width: output.get_width(),
    height: output.get_height(),
    x: output.get_x(),
    y: output.get_y(),
    focused: isFocused,
    scale: output.get_scale_factor(),
  };
}

// Generate workspaces from outputs
function generateWorkspaces(outputs: any[]): Workspace[] {
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
}

// Get focused workspace from a single output
function getFocusedWorkspaceFromOutput(output: any): Workspace | null {
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
}

// Create a unified reactive interface of compositor data to use in components
@register({ GTypeName: "RiverAdapter" })
export class RiverAdapter extends GObject.Object implements CompositorAdapter {
  readonly name = "river";
  // Type as any since we cant import River.River directly
  readonly river: any;

  readonly focusedMonitor: Accessor<Monitor | null>;
  readonly monitors: Accessor<Monitor[]>;
  readonly focusedWorkspace: Accessor<Workspace | null>;
  readonly workspaces: Accessor<Workspace[]>;
  readonly focusedClient: Accessor<Client | null>;
  readonly clients: Accessor<Client[]>;

  constructor() {
    super();

    try {
      const RiverModule = getRiver();
      this.river = RiverModule.get_default();
    } catch (error) {
      throw new Error("River not available");
    }

    const getOutputs = () => this.river.get_outputs();

    const getFocusedOutputName = () => this.river.get_focused_output();

    const findOutputByName = (name: string | null) => {
      if (!name) return null;
      return getOutputs().find((o: any) => o.get_name() === name);
    };

    const generateMonitors = (): Monitor[] => {
      const outputs = getOutputs();
      const focusedName = getFocusedOutputName();
      return outputs.map((output: any) =>
        outputToMonitor(output, output.get_name() === focusedName),
      );
    };

    const getCurrentFocusedWorkspace = (): Workspace | null => {
      const output = findOutputByName(getFocusedOutputName());
      return output ? getFocusedWorkspaceFromOutput(output) : null;
    };

    const getCurrentWorkspaces = (): Workspace[] => {
      return generateWorkspaces(getOutputs());
    };

    // Monitor bindings
    this.focusedMonitor = createBinding(
      this.river,
      "focused-output",
    )((focusedOutputName: string | null): Monitor | null => {
      const output = findOutputByName(focusedOutputName);
      return output ? outputToMonitor(output, true) : null;
    });

    this.monitors = createConnection(generateMonitors(), [
      this.river,
      "changed",
      generateMonitors,
    ]);

    // Workspace bindings
    this.workspaces = createConnection(getCurrentWorkspaces(), [
      this.river,
      "changed",
      getCurrentWorkspaces,
    ]);

    this.focusedWorkspace = createConnection(getCurrentFocusedWorkspace(), [
      this.river,
      "changed",
      getCurrentFocusedWorkspace,
    ]);

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
        monitor: getFocusedOutputName() || "",
        floating: false,
        fullscreen: false,
        focused: true,
      };
    });

    // River doesnt support this
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
