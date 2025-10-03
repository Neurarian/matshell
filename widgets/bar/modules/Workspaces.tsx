// widgets/bar/RiverWorkspaces.tsx
import { For, createState, createComputed } from "ags";
import { compositor } from "utils/compositor/detector";
import { Gdk } from "ags/gtk4";

interface RiverWorkspacesProps {
  gdkmonitor?: Gdk.Monitor;
}

export function RiverWorkspaces({ gdkmonitor }: RiverWorkspacesProps = {}) {
  // Get the compositor monitor name from GDK monitor
  const monitorName = gdkmonitor?.get_connector() || null;

  const monitors = compositor.getMonitors();
  const monitorMap = new Map(monitors.map((m, idx) => [m.name, idx]));

  const [buttons] = createState([...Array(9)].map((_, i) => ({ id: i + 1 })));

  return (
    <box cssClasses={["Workspaces"]}>
      <For each={buttons}>
        {(button) => {
          // Compute visibility dynamically - only for THIS monitor
          const visible = createComputed([compositor.workspaces], (wss) => {
            // Filter to only this monitor's workspaces
            const thisMonitorWorkspaces = monitorName
              ? wss.filter((ws) => ws.monitor === monitorName)
              : wss;

            // Find the highest occupied/focused tag number on THIS monitor
            const maxOccupiedTag = Math.max(
              0,
              ...thisMonitorWorkspaces
                .filter((ws) => ws.occupied || ws.focused)
                .map((ws) => parseInt(ws.name)),
            );

            return button.id <= maxOccupiedTag;
          });

          const cssClasses = createComputed(
            [compositor.workspaces, compositor.focusedWorkspace],
            (wss, fw) => {
              const classes: string[] = [];

              // Find matching workspace for this tag ON THIS MONITOR
              const matchingWorkspace = monitorName
                ? wss.find(
                    (w) =>
                      parseInt(w.name) === button.id &&
                      w.monitor === monitorName,
                  )
                : wss.find((w) => parseInt(w.name) === button.id);

              if (!matchingWorkspace) return classes;

              // Check states for this specific monitor's workspace
              const isFocused =
                fw &&
                matchingWorkspace.name === fw.name &&
                matchingWorkspace.monitor === fw.monitor;
              const isOccupied = matchingWorkspace.occupied;
              const isUrgent = matchingWorkspace.urgent;

              // Only add monitor color if occupied OR focused (keeps unoccupied grey)
              const monitorIndex =
                isOccupied || isFocused
                  ? monitorMap.get(matchingWorkspace.monitor)
                  : undefined;

              if (isFocused) classes.push("focused");
              if (isOccupied) classes.push("occupied");
              if (isUrgent) classes.push("urgent");
              if (monitorIndex !== undefined) {
                classes.push(`monitor${monitorIndex}`);
              }

              return classes;
            },
          );

          return (
            <button
              visible={visible}
              cssClasses={cssClasses}
              onClicked={() => compositor.focusWorkspace(button.id)}
            />
          );
        }}
      </For>
    </box>
  );
}

export function HyprlandWorkspaces() {
  const monitors = compositor.getMonitors();
  const monitorIndexMap = new Map(monitors.map((m, index) => [m.name, index]));

  const workspaceButtons = compositor.workspaces((wss) => {
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
        monitorIndex: ws?.monitor ? monitorIndexMap.get(ws.monitor) : undefined,
      };
    });
  });

  return (
    <box cssClasses={["Workspaces"]}>
      <For each={workspaceButtons}>
        {(buttonData) => (
          <button
            visible={buttonData.visible}
            cssClasses={compositor.focusedWorkspace((fw) => {
              const classes: string[] = [];

              if (
                buttonData.workspace &&
                fw &&
                Number(buttonData.workspace.id) === Number(fw.id)
              ) {
                classes.push("focused");
              }

              if (buttonData.workspace?.occupied) classes.push("occupied");
              if (buttonData.workspace?.urgent) classes.push("urgent");

              // Use numeric monitor index
              if (buttonData.monitorIndex !== undefined) {
                classes.push(`monitor${buttonData.monitorIndex}`);
              }

              return classes;
            })}
            onClicked={() => compositor.focusWorkspace(buttonData.id)}
          ></button>
        )}
      </For>
    </box>
  );
}
