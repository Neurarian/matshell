import Bluetooth from "gi://AstalBluetooth";
import type { BluetoothIconType } from "./types.ts";

export const getBluetoothIcon = (bt: Bluetooth.Bluetooth): BluetoothIconType => {
  if (!bt.is_powered) return "bluetooth-disabled-symbolic";
  if (bt.is_connected) return "bluetooth-active-symbolic";
  return "bluetooth-disconnected-symbolic";
};

export const getBluetoothText = (bt: Bluetooth.Bluetooth): string => {
  if (!bt.is_powered) return "Bluetooth off";
  return "Bluetooth on";
};

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
