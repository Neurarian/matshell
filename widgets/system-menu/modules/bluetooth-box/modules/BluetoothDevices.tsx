import { execAsync } from "ags/process";
import { Gtk } from "ags/gtk4";
import { createBinding, createComputed, For } from "ags";
import { BluetoothItem } from "./BluetoothItem.tsx";
import Bluetooth from "gi://AstalBluetooth";
import { scanDevices, stopScan, setIsExpanded } from "utils/bluetooth";
import options from "options.ts";

export const BluetoothDevices = () => {
  const bluetooth = Bluetooth.get_default();

  // Create reactive accessors for each device category
  const devices = createBinding(bluetooth, "devices");

  const connectedDevices = createComputed([devices], (deviceList) =>
    deviceList.filter((device) => device.name != null && device.connected),
  );

  const pairedDevices = createComputed([devices], (deviceList) =>
    deviceList.filter(
      (device) => device.name != null && device.paired && !device.connected,
    ),
  );

  const unpairedDevices = createComputed([devices], (deviceList) =>
    deviceList.filter((device) => device.name != null && !device.paired),
  );

  // Computed for empty state and section visibility
  const hasDevices = createComputed(
    [devices],
    (deviceList) =>
      deviceList.filter((device) => device.name != null).length > 0,
  );

  const hasKnownDevices = createComputed(
    [connectedDevices, pairedDevices],
    (connected, paired) => connected.length > 0 || paired.length > 0,
  );

  return (
    <box
      marginTop={4}
      orientation={Gtk.Orientation.VERTICAL}
      cssClasses={["system-menu-list"]}
    >
      {/* Empty state */}
      <box visible={hasDevices((has) => !has)}>
        <label
          label="No devices found"
          cssClasses={["empty-label"]}
          halign={Gtk.Align.CENTER}
          hexpand
        />
      </box>

      {/* Known Devices Section */}
      <box orientation={Gtk.Orientation.VERTICAL} visible={hasKnownDevices}>
        <label label="My Devices" cssClasses={["section-label"]} />

        {/* Connected devices */}
        <box
          orientation={Gtk.Orientation.VERTICAL}
          visible={connectedDevices((devices) => devices.length > 0)}
        >
          <For each={connectedDevices}>
            {(device) => <BluetoothItem device={device} />}
          </For>
        </box>

        {/* Paired devices */}
        <box
          orientation={Gtk.Orientation.VERTICAL}
          visible={pairedDevices((devices) => devices.length > 0)}
        >
          <For each={pairedDevices}>
            {(device) => <BluetoothItem device={device} />}
          </For>
        </box>
      </box>

      {/* Available/Unpaired Devices */}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        visible={unpairedDevices((devices) => devices.length > 0)}
      >
        <label label="Available Devices" cssClasses={["section-label"]} />
        <For each={unpairedDevices}>
          {(device) => <BluetoothItem device={device} />}
        </For>
      </box>

      {/* Control buttons */}
      <box hexpand visible={hasDevices}>
        <button
          halign={Gtk.Align.START}
          cssClasses={["refresh-button"]}
          onClicked={() => {
            bluetooth.adapter?.discovering ? stopScan() : scanDevices();
          }}
        >
          <image
            iconName={createBinding(
              bluetooth.adapter,
              "discovering",
            )((discovering) =>
              discovering ? "process-stop-symbolic" : "view-refresh-symbolic",
            )}
          />
        </button>

        <box hexpand />

        <button
          cssClasses={["settings-button"]}
          halign={Gtk.Align.END}
          hexpand={false}
          visible={options["system-menu.modules.bluetooth.enableOverskride"]}
          onClicked={() => {
            execAsync("overskride");
            setIsExpanded(false);
          }}
        >
          <image iconName={"emblem-system-symbolic"} />
        </button>
      </box>
    </box>
  );
};
