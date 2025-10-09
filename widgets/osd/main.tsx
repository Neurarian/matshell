import Cairo from "gi://cairo";
import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";
import { createState, onCleanup } from "ags";
import { gdkmonitor } from "utils/monitors.ts";
import OnScreenProgress from "./modules/Progress.tsx";
import options from "options.ts";

export default function OnScreenDisplay() {
  const { TOP, BOTTOM } = Astal.WindowAnchor;
  const [visible, setVisible] = createState(false);

  return (
    <window
      visible={visible}
      name="osd"
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      gdkmonitor={gdkmonitor}
      anchor={options["bar.position"]((pos) => {
        switch (pos) {
          case "top":
            return BOTTOM;
          case "bottom":
            return TOP;
          default:
            return BOTTOM;
        }
      })}
      $={(self) => {
        const surface = self.get_native()?.get_surface();
        if (surface) {
          surface.set_input_region(new Cairo.Region());
        }
        onCleanup(() => self.destroy());
      }}
      application={app}
      keymode={Astal.Keymode.NONE}
    >
      <OnScreenProgress visible={visible} setVisible={setVisible} />
    </window>
  );
}
