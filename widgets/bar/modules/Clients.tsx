import { For, createComputed, Accessor } from "ags";
import { compositor } from "utils/compositor/detector";
import { Client } from "utils/compositor/types";
import { getAppIcon } from "utils/clients";
import { Gdk } from "ags/gtk4";

interface ClientButtonProps {
  client: Client;
  isFocused: boolean;
}

function ClientButton({ client, isFocused }: ClientButtonProps) {
  const iconName = getAppIcon(client.class, true);

  return (
    <button
      cssClasses={["client-button", isFocused ? "focused" : ""]}
      onClicked={() => {
        if (isFocused) return;

        if (compositor.focusClient) {
          try {
            compositor.focusClient(client.address);
          } catch (e) {
            console.error("Failed to focus client:", e);
          }
        } else {
          const focusedWorkspace = compositor.focusedWorkspace.get();
          if (focusedWorkspace?.id !== client.workspace) {
            try {
              compositor.focusWorkspace(client.workspace);
            } catch (e) {
              console.error("Failed to focus workspace:", e);
            }
          }
        }
      }}
      tooltipText={client.title || client.class}
    >
      <image iconName={iconName} cssClasses={["client-icon"]} />
    </button>
  );
}

interface ClientsContainerProps {
  gdkmonitor?: Gdk.Monitor;
}

export function Clients({ gdkmonitor }: ClientsContainerProps = {}) {
  const monitorName = gdkmonitor?.get_connector() || null;

  const clients = createComputed(
    [compositor.clients, compositor.focusedClient],
    (clients, focusedClient) => {
      const filteredClients = monitorName
        ? clients.filter((c) => c.monitor === monitorName)
        : clients;

      const sorted = filteredClients.sort(
        (a, b) => Number(a.workspace) - Number(b.workspace),
      );

      return sorted.map((client) => ({
        client,
        isFocused: focusedClient?.address === client.address,
      }));
    },
  );

  return (
    <box cssClasses={["Clients"]}>
      <For each={clients}>
        {(data) => (
          <ClientButton client={data.client} isFocused={data.isFocused} />
        )}
      </For>
    </box>
  );
}
