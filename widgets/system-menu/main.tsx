import { Astal, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import PowerProfiles from "gi://AstalPowerProfiles";
import { createState } from "ags";
import { Sliders } from "./modules/Sliders.tsx";
import { Toggles } from "./modules/Toggles.tsx";
import { PowerProfileBox } from "./modules/PowerProfileBox.tsx";
import { BatteryBox } from "./modules/BatteryBox.tsx";
import { NotificationBox } from "./modules/notification-center/main.tsx";
import options from "options.ts";

export default function SystemMenu() {
  const powerprofiles = PowerProfiles.get_default();
  const hasProfiles = powerprofiles?.get_profiles()?.length > 0;
  const { TOP, BOTTOM, RIGHT } = Astal.WindowAnchor;
  const [visible, _setVisible] = createState(false);

  return (
    <window
      name="system-menu"
      application={app}
      layer={Astal.Layer.OVERLAY}
      anchor={options["bar.position"]((pos) => {
        switch (pos) {
          case "top":
            return TOP | RIGHT;
          case "bottom":
            return BOTTOM | RIGHT;
          default:
            return TOP | RIGHT;
        }
      })}
      keymode={Astal.Keymode.ON_DEMAND}
      visible={visible}
    >
      <box
        cssClasses={["system-menu"]}
        widthRequest={285}
        orientation={Gtk.Orientation.VERTICAL}
      >
        <Toggles />
        {hasProfiles && <PowerProfileBox />}
        <Sliders />
        <BatteryBox />
        <NotificationBox />
      </box>
    </window>
  );
}
