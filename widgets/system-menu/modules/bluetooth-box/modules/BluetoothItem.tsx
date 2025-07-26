import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createState, createBinding, createComputed, onCleanup } from "ags";
import Pango from "gi://Pango";
import {
  connectToDevice,
  disconnectDevice,
  pairDevice,
  unpairDevice,
  toggleTrust,
  isExpanded,
  getBluetoothDeviceText,
} from "utils/bluetooth.ts";

// Device Item component
export const BluetoothItem = ({ device }) => {
  const [itemButtonsRevealed, setItemButtonsRevealed] = createState(false);

  const deviceConnected = createBinding(device, "connected");
  const devicePaired = createBinding(device, "paired");
  const deviceTrusted = createBinding(device, "trusted");
  const deviceConnecting = createBinding(device, "connecting");

  // Create computed value for connection button icon
  const connectionButtonIcon = createComputed(
    [deviceConnected, deviceConnecting],
    (connected, connecting) => {
      if (connected) return "bluetooth-active-symbolic";
      else if (connecting) return "bluetooth-acquiring-symbolic";
      else return "bluetooth-disconnected-symbolic";
    },
  );

  return (
    <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["bt-device-item"]}>
      <button
        hexpand={true}
        cssClasses={deviceConnected((connected) =>
          connected
            ? ["network-item", "network-item-connected"]
            : ["network-item", "network-item-disconnected"],
        )}
        onClicked={() => {
          setItemButtonsRevealed((prev) => !prev);
        }}
      >
        <label
          halign={Gtk.Align.START}
          maxWidthChars={24}
          ellipsize={Pango.EllipsizeMode.END}
          label={getBluetoothDeviceText(device)}
        />
      </button>

      <revealer
        revealChild={itemButtonsRevealed}
        transitionDuration={200}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        onNotifyChildRevealed={(revealer) => {
          const window = app.get_window("system-menu");
          if (window && !revealer.childRevealed) {
            // Use GTK's resize mechanism. Fixes https://github.com/Aylur/astal/issues/258
            window.set_default_size(-1, -1);
          }
        }}
        $={(_self) => {
          // Close revealer if parent revealer is closed
          const unsubscribeParent = isExpanded.subscribe((parentExpanded) => {
            if (!parentExpanded) {
              setItemButtonsRevealed(false);
            }
          });

          const windowListener = app.connect("window-toggled", (_, window) => {
            if (
              window.name === "system-menu" &&
              !window.visible &&
              itemButtonsRevealed.get()
            ) {
              setItemButtonsRevealed(false);
            }
          });

          onCleanup(() => {
            app.disconnect(windowListener);
            unsubscribeParent();
          });
        }}
      >
        <box
          orientation={Gtk.Orientation.HORIZONTAL}
          cssClasses={["bt-button-container"]}
          homogeneous={true}
        >
          <button
            hexpand={true}
            cssClasses={deviceConnected((connected) =>
              connected
                ? ["button", "connect-button"]
                : ["button-disabled", "connect-button"],
            )}
            visible={devicePaired}
            onClicked={() => {
              if (!deviceConnecting.get()) {
                deviceConnected.get()
                  ? disconnectDevice(device)
                  : connectToDevice(device);
              }
            }}
            tooltipText={deviceConnected((connected) =>
              connected ? "Disconnect" : "Connect",
            )}
          >
            <image iconName={connectionButtonIcon} />
          </button>

          <button
            hexpand={true}
            cssClasses={deviceTrusted((trusted) =>
              trusted
                ? ["button", "trust-button"]
                : ["button-disabled", "trust-button"],
            )}
            visible={devicePaired}
            onClicked={() => toggleTrust(device)}
            tooltipText={deviceTrusted((trusted) =>
              trusted ? "Untrust" : "Trust",
            )}
          >
            <image
              iconName={deviceTrusted((trusted) =>
                trusted ? "security-high-symbolic" : "security-low-symbolic",
              )}
            />
          </button>

          <button
            hexpand={true}
            cssClasses={devicePaired((paired) =>
              paired
                ? ["button", "pair-button"]
                : ["button-disabled", "pair-button"],
            )}
            onClicked={() => {
              devicePaired.get() ? unpairDevice(device) : pairDevice(device);
            }}
            tooltipText={devicePaired((paired) => (paired ? "Unpair" : "Pair"))}
          >
            <image
              iconName={devicePaired((paired) =>
                paired
                  ? "network-transmit-receive-symbolic"
                  : "network-offline-symbolic",
              )}
            />
          </button>
        </box>
      </revealer>
    </box>
  );
};
