import { bind } from "astal";
import Battery from "gi://AstalBattery";
import { Gtk } from "astal/gtk3";


export const BatteryBox = () => {
  const battery = Battery.get_default();
  const batteryEnergy = (energyRate: Battery.energyRate) => {
    return energyRate > 0.1 ? `${Math.round(energyRate * 10) / 10} W ` : "";
  };
  return (
    <box className={"battery-info"}
      visible={bind(battery, "is-battery")}
    >
      <box className={"battery-box"}>
        <icon icon={bind(battery, "battery-icon-name")}
          tooltipText={bind(battery, "energy-rate").as((er) => batteryEnergy(er))}
        />
        <label label={bind(battery, "percent").as((p) => `${p * 100}%`)} />
        <label className={"time"}
          vexpand={true}
          valign={Gtk.Align.CENTER}
          visible={bind(battery, "charging").as((c) => !c)}
          label={bind(battery, "energy-rate").as((er) => batteryEnergy(er))}
        />
      </box>
    </box >
  )
}
