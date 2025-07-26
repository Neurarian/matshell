import { createComputed, createBinding } from "ags";
import { Gtk } from "ags/gtk4";

import { WiFiBox } from "./wifi-box/main.tsx";
import { BluetoothBox } from "./bluetooth-box/main.tsx";
import Bluetooth from "gi://AstalBluetooth";
import Network from "gi://AstalNetwork";

export const Toggles = () => {
  const bluetooth = Bluetooth.get_default();
  const network = Network.get_default();

  // Create bindings for the GObject properties
  const bluetoothAdapter = createBinding(bluetooth, "adapter");
  const networkPrimary = createBinding(network, "primary");

  // Use createComputed instead of Variable.derive
  const renderToggleBox = createComputed(
    [bluetoothAdapter, networkPrimary],
    (hasAdapter, primary) => hasAdapter || primary === Network.Primary.WIFI,
  );

  return (
    <box orientation={Gtk.Orientation.VERTICAL} visible={renderToggleBox}>
      {/* WiFi Box */}
      <box visible={networkPrimary((p) => p !== Network.Primary.WIRED)}>
        <WiFiBox />
      </box>

      {/* Bluetooth Box */}
      <box visible={bluetoothAdapter}></box>
      <BluetoothBox />
    </box>
  );
};
