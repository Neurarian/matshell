import Bluetooth from "gi://AstalBluetooth";
import { createBinding, createComputed } from "ags";

const bluetooth = Bluetooth.get_default();
const isPowered = createBinding(bluetooth, "is_powered");
const isConnected = createBinding(bluetooth, "is_connected");

export const bluetoothIcon = createComputed(
  [isPowered, isConnected],
  (powered, connected) => {
    if (!powered) return "bluetooth-disabled-symbolic";
    if (connected) return "bluetooth-active-symbolic";
    return "bluetooth-disconnected-symbolic";
  },
);

export const bluetoothTooltip = isPowered((powered) =>
  powered ? "Bluetooth on" : "Bluetooth off",
);

export const getBluetoothDeviceText = (device: Bluetooth.Device): string => {
  let batteryText = "";
  if (device.connected && device.battery_percentage > 0) {
    batteryText = ` ${Math.round(device.battery_percentage * 100)}%`;
  }
  return `${device.name}${batteryText}`;
};

export const getDeviceStatusText = (device: Bluetooth.Device): string => {
  if (device.connected) return "Connected";
  if (device.paired) return "Paired";
  return "Available";
};
