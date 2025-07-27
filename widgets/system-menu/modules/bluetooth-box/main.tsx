import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createBinding, onCleanup } from "ags";
import Bluetooth from "gi://AstalBluetooth";
import { BluetoothDevices } from "./modules/BluetoothDevices.tsx";
import {
  getBluetoothIcon,
  getBluetoothText,
  isExpanded,
  setIsExpanded,
} from "utils/bluetooth.ts";

export const BluetoothBox = () => {
  const bluetooth = Bluetooth.get_default();

  return (
    <box cssClasses={["toggle"]} orientation={Gtk.Orientation.VERTICAL}>
      {/* Bluetooth Toggle Header */}
      <box>
        <button
          onClicked={() => {
            bluetooth.toggle();
          }}
          cssClasses={createBinding(
            bluetooth,
            "is_powered",
          )((powered) => (powered ? ["button"] : ["button-disabled"]))}
        >
          <image
            iconName={createBinding(
              bluetooth,
              "devices",
            )(() => getBluetoothIcon(bluetooth))}
          />
        </button>
        <button
          hexpand={true}
          onClicked={() => {
            if (bluetooth.is_powered) {
              setIsExpanded((prev) => !prev);
            }
          }}
        >
          <box hexpand={true}>
            <label
              xalign={0}
              hexpand={true}
              label={getBluetoothText(bluetooth) || "Bluetooth"}
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

      {/* Devices List Revealer */}
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={250}
        revealChild={isExpanded}
        onNotifyChildRevealed={(revealer) => {
          const window = app.get_window("system-menu");
          if (window && !revealer.childRevealed) {
            // Use GTK's resize mechanism. Fixes https://github.com/Aylur/astal/issues/258
            window.set_default_size(-1, -1);
          }
        }}
        $={(self) => {
          const windowListener = app.connect("window-toggled", (_, window) => {
            if (
              window.name === "system-menu" &&
              !window.visible &&
              isExpanded
            ) {
              setIsExpanded(false);
            }
          });

          onCleanup(() => {
            app.disconnect(windowListener);
          });
        }}
      >
        {/* Bluetooth Devices */}
        <BluetoothDevices />
      </revealer>
    </box>
  );
};

export default BluetoothBox;
