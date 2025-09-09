import { createBinding } from "ags";
import Bluetooth from "gi://AstalBluetooth";
import { bluetoothIcon, bluetoothTooltip } from "utils/bluetooth";

export default function Blue() {
  const bluetooth = Bluetooth.get_default();
  return (
    <image
      cssClasses={["bluetooth", "module"]}
      visible={createBinding(bluetooth, "adapter")}
      iconName={bluetoothIcon}
      tooltipText={bluetoothTooltip}
    />
  );
}
