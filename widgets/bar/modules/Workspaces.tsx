import Hyprland from "gi://AstalHyprland";
import { createBinding, For, With } from "ags";

function FocusedClient() {
  const hypr = Hyprland.get_default();
  const focused = createBinding(hypr, "focusedClient");

  return (
    <box cssClasses={["Focused"]}>
      <With value={focused}>
        {(client) =>
          client && (
            <label
              label={createBinding(client, "title")((title) => String(title))}
            />
          )
        }
      </With>
    </box>
  );
}

export default function Workspaces() {
  const hypr = Hyprland.get_default();

  const workspaceButtons = createBinding(
    hypr,
    "workspaces",
  )((wss) => {
    const activeWorkspaces = wss
      .filter((ws) => !(ws.id >= -99 && ws.id <= -2))
      .sort((a, b) => a.id - b.id);

    const maxId = activeWorkspaces[activeWorkspaces.length - 1]?.id || 1;

    return [...Array(10)].map((_, i) => {
      const id = i + 1;
      const ws = activeWorkspaces.find((w) => w.id === id);

      return {
        id,
        workspace: ws,
        visible: maxId >= id,
        isActive: ws !== undefined,
      };
    });
  });

  return (
    <box cssClasses={["Workspaces"]}>
      <For each={workspaceButtons}>
        {(buttonData) => (
          <button
            visible={buttonData.visible}
            cssClasses={createBinding(
              hypr,
              "focusedWorkspace",
            )((fw) => {
              const classes: string[] = [];
              if (buttonData.workspace === fw) classes.push("focused");
              if (buttonData.workspace?.monitor) {
                classes.push(`monitor${buttonData.workspace.monitor.id}`);
              }
              return classes;
            })}
            onClicked={() =>
              hypr.message(`dispatch workspace ${buttonData.id}`)
            }
          ></button>
        )}
      </For>
    </box>
  );
}
