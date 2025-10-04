import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createState, onCleanup } from "ags";
import Pango from "gi://Pango";
import { createDeviceManager, isExpanded } from "utils/bluetooth";

export const BluetoothItem = ({ device }) => {
  const [itemButtonsRevealed, setItemButtonsRevealed] = createState(false);

  const deviceManager = createDeviceManager(device);

  return (
    <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["bt-device-item"]}>
      <button
        hexpand={true}
        cssClasses={deviceManager.connectionClasses}
        onClicked={() => setItemButtonsRevealed((prev) => !prev)}
      >
        <label
          halign={Gtk.Align.START}
          maxWidthChars={24}
          ellipsize={Pango.EllipsizeMode.END}
          label={deviceManager.displayInfo(
            (info) => `${info.name}${info.batteryText}`,
          )}
        />
      </button>

      <revealer
        revealChild={itemButtonsRevealed}
        transitionDuration={200}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        onNotifyChildRevealed={(revealer) => {
          const window = app.get_window("system-menu");
          if (window && !revealer.childRevealed) {
            window.set_default_size(-1, -1);
          }
        }}
        $={(_self) => {
          const unsubscribeParent = isExpanded.subscribe(() => {
            if (!isExpanded.get()) setItemButtonsRevealed(false);
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
          {/* Connect/Disconnect Button */}
          <button
            hexpand={true}
            cssClasses={deviceManager.isConnected((connected) =>
              connected
                ? ["button", "connect-button"]
                : ["button-disabled", "connect-button"],
            )}
            visible={deviceManager.isPaired}
            onClicked={() => {
              deviceManager.isConnected.get()
                ? deviceManager.disconnect()
                : deviceManager.connect();
            }}
            tooltipText={deviceManager.connectionTooltip}
          >
            <image iconName={deviceManager.connectionIcon} />
          </button>

          {/* Trust Button */}
          <button
            hexpand={true}
            cssClasses={deviceManager.isTrusted((trusted) =>
              trusted
                ? ["button", "trust-button"]
                : ["button-disabled", "trust-button"],
            )}
            visible={deviceManager.isPaired}
            onClicked={() => deviceManager.toggleTrust()}
            tooltipText={deviceManager.trustTooltip}
          >
            <image iconName={deviceManager.trustIcon} />
          </button>

          {/* Pair/Unpair Button */}
          <button
            hexpand={true}
            cssClasses={deviceManager.isPaired((paired) =>
              paired
                ? ["button", "pair-button"]
                : ["button-disabled", "pair-button"],
            )}
            onClicked={() => {
              deviceManager.isPaired.get()
                ? deviceManager.unpair()
                : deviceManager.pair();
            }}
            tooltipText={deviceManager.pairTooltip}
          >
            <image iconName={deviceManager.pairIcon} />
          </button>
        </box>
      </revealer>
    </box>
  );
};
