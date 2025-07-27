import { createBinding } from "ags";
import Bluetooth from "gi://AstalBluetooth";
import { getBluetoothIcon, getBluetoothText } from "utils/bluetooth";

export default function Blue() {
  const bluetooth = Bluetooth.get_default();
  return (
    <image
      cssClasses={["bluetooth", "module"]}
      visible={createBinding(bluetooth, "adapter")}
      iconName={createBinding(
        bluetooth,
        "devices",
      )(() => getBluetoothIcon(bluetooth))}
      tooltipText={createBinding(
        bluetooth,
        "is_powered",
      )(() => getBluetoothText(bluetooth))}
    />
  );
}
