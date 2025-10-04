import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createBinding, createState, For, onCleanup } from "ags";
import { execAsync } from "ags/process";
import { interval } from "ags/time";
import Network from "gi://AstalNetwork";
import { NetworkItem } from "./modules/NetworkItem.tsx";
import { PasswordDialog } from "./modules/PasswordDialog.tsx";
import {
  availableNetworks,
  savedNetworks,
  activeNetwork,
  showPasswordDialog,
  scanTimer,
  setScanTimer,
  scanNetworks,
  getSavedNetworks,
  disconnectNetwork,
  forgetNetwork,
} from "utils/wifi";
import options from "options.ts";

// Main WiFi Box component
export const WiFiBox = () => {
  const network = Network.get_default();
  const [isExpanded, setIsExpanded] = createState(false);

  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      cssClasses={["wifi-menu", "toggle"]}
    >
      {/* WiFi Toggle Header */}
      <box cssClasses={["toggle", "wifi-toggle"]}>
        <button
          onClicked={() => {
            network.wifi.enabled
              ? network.wifi.set_enabled(false)
              : network.wifi.set_enabled(true);
          }}
          cssClasses={createBinding(
            network.wifi,
            "enabled",
          )((enabled) => (enabled ? ["button"] : ["button-disabled"]))}
        >
          <image iconName={createBinding(network.wifi, "icon_name")} />
        </button>
        <button
          hexpand={true}
          onClicked={() => {
            if (network.wifi.enabled) {
              setIsExpanded((prev) => !prev);
              if (!isExpanded.get()) {
                scanNetworks();
                getSavedNetworks();
              }
            }
          }}
        >
          <box hexpand={true}>
            <label
              hexpand={true}
              xalign={0}
              label={createBinding(
                network.wifi,
                "ssid",
              )(
                (ssid) =>
                  ssid || (network.wifi.enabled ? "Not Connected" : "WiFi Off"),
              )}
            />
            <image
              iconName="pan-end-symbolic"
              halign={Gtk.Align.END}
              cssClasses={isExpanded((expanded) =>
                expanded
                  ? ["arrow-indicator", "arrow-down"]
                  : ["arrow-indicator"],
              )}
            />
          </box>
        </button>
      </box>

      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={300}
        revealChild={isExpanded}
        onNotifyChildRevealed={(revealer) => {
          const window = app.get_window("system-menu");
          if (window && !revealer.childRevealed) {
            window.set_default_size(-1, -1);
          }
        }}
        $={(self) => {
          const unsubscribeExpanded = isExpanded.subscribe(() => {
            const expanded = isExpanded.get();

            if (expanded) {
              scanTimer.get()?.cancel();
              setScanTimer(null);

              if (network.wifi?.enabled) {
                const newTimer = interval(10000, () => {
                  scanNetworks();
                  getSavedNetworks();
                });
                setScanTimer(newTimer);
              }
            } else {
              scanTimer.get()?.cancel();
              setScanTimer(null);
            }
          });

          const windowListener = app.connect("window-toggled", (_, window) => {
            if (
              window.name === "system-menu" &&
              !window.visible &&
              isExpanded.get()
            ) {
              setIsExpanded(false);
            }
          });

          onCleanup(() => {
            scanTimer.get()?.cancel();
            setScanTimer(null);
            app.disconnect(windowListener);
            unsubscribeExpanded();
          });
        }}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["system-menu-list"]}
        >
          {/* Password Dialog */}
          <box visible={showPasswordDialog}>
            <PasswordDialog />
          </box>

          {/* Available Networks */}
          <box orientation={Gtk.Orientation.VERTICAL}>
            <label label="Available Networks" cssClasses={["section-label"]} />

            {/* Empty state container */}
            <box
              visible={availableNetworks((networks) => networks.length === 0)}
            >
              <label
                label="No networks found"
                cssClasses={["empty-label"]}
                halign={Gtk.Align.CENTER}
                hexpand
              />
            </box>

            {/* Networks list container */}
            <box
              orientation={Gtk.Orientation.VERTICAL}
              visible={availableNetworks((networks) => networks.length > 0)}
            >
              <For each={availableNetworks}>
                {(network) => <NetworkItem network={network} />}
              </For>
            </box>
          </box>

          {/* Saved Networks */}
          <box
            orientation={Gtk.Orientation.VERTICAL}
            visible={savedNetworks((saved) => {
              const filtered = saved.filter(
                (ssid) => !availableNetworks.get().some((n) => n.ssid === ssid),
              );
              return filtered.length > 0;
            })}
          >
            <label label="Saved Networks" cssClasses={["section-label"]} />
            <For each={savedNetworks}>
              {(ssid) => {
                // Only render if not in available networks
                const shouldShow = !availableNetworks
                  .get()
                  .some((n) => n.ssid === ssid);
                return (
                  <box cssClasses={["saved-network"]} visible={shouldShow}>
                    <label label={ssid} />
                    <box hexpand={true} />
                    <button
                      label="Forget"
                      cssClasses={["forget-button", "button"]}
                      onClicked={() => forgetNetwork(ssid)}
                    />
                  </box>
                );
              }}
            </For>
          </box>

          {/* Controls Container */}
          <box hexpand>
            {/* Refresh Button */}
            <button
              halign={Gtk.Align.START}
              cssClasses={["refresh-button"]}
              onClicked={() => {
                scanNetworks();
                getSavedNetworks();
              }}
            >
              <image iconName="view-refresh-symbolic" />
            </button>

            {/* Connected Network Options */}
            <box hexpand>
              <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["connected-network"]}
                hexpand
                visible={activeNetwork((active) => active !== null)}
              >
                <button
                  label="Disconnect"
                  cssClasses={["disconnect-button"]}
                  onClicked={() => {
                    const active = activeNetwork.get();
                    if (active) disconnectNetwork(active.ssid);
                  }}
                />
              </box>
            </box>

            {/* Advanced Settings Button */}
            <button
              cssClasses={["settings-button"]}
              halign={Gtk.Align.END}
              hexpand={false}
              visible={options["system-menu.modules.wifi-advanced.enable"](
                (value) => Boolean(value),
              )}
              onClicked={() => {
                execAsync(["sh", "-c", String(options["app.wifi"].get())]);
                setIsExpanded(false);
              }}
            >
              <image iconName={"emblem-system-symbolic"} />
            </button>
          </box>
        </box>
      </revealer>
    </box>
  );
};
