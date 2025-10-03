// widgets/bar/RiverWorkspaces.tsx
import { For, createComputed, Accessor } from "ags";
import { compositor } from "utils/compositor/detector";
import { Gdk } from "ags/gtk4";

const monitorIndexMap = compositor.monitors((monitors) => {
  return new Map(monitors.map((m, index) => [m.name, index]));
});

interface WorkspaceButtonData {
  id: number;
  workspace: any;
  visible: boolean;
  monitorIndex: number | undefined;
}

function WorkspacesContainer({
  buttons,
}: {
  buttons: Accessor<WorkspaceButtonData[]>;
}) {
  return (
    <box cssClasses={["Workspaces"]}>
      <For each={buttons}>
        {(buttonData) => (
          <button
            visible={buttonData.visible}
            cssClasses={compositor.focusedWorkspace((fw) => {
              const classes: string[] = [];
              const ws = buttonData.workspace;

              if (!ws) return classes;

              const isFocused =
                fw &&
                String(ws.id) === String(fw.id) &&
                ws.monitor === fw.monitor;

              if (isFocused) classes.push("focused");
              if (ws.occupied) classes.push("occupied");
              // AstalRiver supports this but not AstalHyprland
              if (ws.urgent) classes.push("urgent");

              // Add monitor color if occupied or focused
              if (
                (ws.occupied || isFocused) &&
                buttonData.monitorIndex !== undefined
              ) {
                classes.push(`monitor${buttonData.monitorIndex}`);
              }

              return classes;
            })}
            onClicked={() => compositor.focusWorkspace(buttonData.id)}
          />
        )}
      </For>
    </box>
  );
}

interface RiverWorkspacesProps {
  gdkmonitor?: Gdk.Monitor;
}

export function RiverWorkspaces({ gdkmonitor }: RiverWorkspacesProps = {}) {
  const monitorName = gdkmonitor?.get_connector() || null;

  const workspaceButtons = createComputed(
    [compositor.workspaces, monitorIndexMap],
    (wss, monMap) => {
      // Filter to this monitor's workspaces
      const thisMonitorWorkspaces = monitorName
        ? wss.filter((ws) => ws.monitor === monitorName)
        : wss;

      // Find highest occupied/focused tag on this monitor
      const maxOccupiedTag = Math.max(
        0,
        ...thisMonitorWorkspaces
          .filter((ws) => ws.occupied || ws.focused)
          .map((ws) => parseInt(ws.name)),
      );

      // River tags 1-9
      return [...Array(9)].map((_, i) => {
        const id = i + 1;
        const ws = thisMonitorWorkspaces.find((w) => parseInt(w.name) === id);

        return {
          id,
          workspace: ws,
          visible: id <= maxOccupiedTag,
          monitorIndex: ws?.monitor ? monMap.get(ws.monitor) : undefined,
        };
      });
    },
  );

  return <WorkspacesContainer buttons={workspaceButtons} />;
}

export function HyprlandWorkspaces() {
  const workspaceButtons = createComputed(
    [compositor.workspaces, monitorIndexMap],
    (wss, monMap) => {
      const activeWorkspaces = wss
        .filter((ws) => {
          const id = Number(ws.id);
          return !(id >= -99 && id <= -2);
        })
        .sort((a, b) => Number(a.id) - Number(b.id));

      const maxId = activeWorkspaces.length
        ? Number(activeWorkspaces[activeWorkspaces.length - 1].id)
        : 1;

      const maxWorkspaces = 10;

      return [...Array(maxWorkspaces)].map((_, i) => {
        const id = i + 1;
        const ws = activeWorkspaces.find((w) => Number(w.id) === id);
        return {
          id,
          workspace: ws,
          visible: maxId >= id,
          isActive: ws !== undefined,
          monitorIndex: ws?.monitor ? monMap.get(ws.monitor) : undefined,
        };
      });
    },
  );

  return <WorkspacesContainer buttons={workspaceButtons} />;
}
