import { Gtk } from "ags/gtk4";
import { createBinding } from "ags";
import Battery from "gi://AstalBattery";
import { toTime } from "utils/battery";

export const BatteryBox = () => {
  const battery = Battery.get_default();
  const batteryEnergy = (energyRate: Battery.energyRate) => {
    return energyRate > 0.1 ? `${Math.round(energyRate * 10) / 10} W ` : "";
  };
  return (
    <box
      cssClasses={["battery-info"]}
      visible={createBinding(battery, "is-battery")}
    >
      <box cssClasses={["battery-box"]}>
        <image
          iconName={createBinding(battery, "battery-icon-name")}
          tooltipText={createBinding(
            battery,
            "energy-rate",
          )((er) => batteryEnergy(er))}
        />
        <label
          label={createBinding(
            battery,
            "percentage",
          )((p) => ` ${Math.round(p * 100)}%`)}
        />
        <label
          cssClasses={["time"]}
          hexpand={true}
          halign={Gtk.Align.END}
          visible={createBinding(battery, "charging")((c) => !c)}
          label={createBinding(battery, "time-to-empty")((t) => toTime(t))}
        />
      </box>
    </box>
  );
};
