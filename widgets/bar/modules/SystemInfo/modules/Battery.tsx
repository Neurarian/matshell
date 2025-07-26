import { createBinding } from "ags";
import Battery from "gi://AstalBattery";

export default function Batt() {
  const battery = Battery.get_default();
  return (
    <image
      cssClasses={["battery", "module"]}
      visible={createBinding(battery, "is-battery")}
      iconName={createBinding(battery, "battery-icon-name")}
      tooltipText={createBinding(
        battery,
        "percentage",
      )((p) => `Battery on ${Math.round(p * 100)}%`)}
    />
  );
}
