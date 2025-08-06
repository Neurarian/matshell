import giCairo from "cairo";
import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";
import { createBinding, createState, onCleanup } from "ags";
import Hyprland from "gi://AstalHyprland";

import { hyprToGdk } from "utils/hyprland";
import OnScreenProgress from "./modules/Progress.tsx";
import options from "options.ts";

export default function OnScreenDisplay() {
  const { TOP, BOTTOM } = Astal.WindowAnchor;
  const hyprland = Hyprland.get_default();
  const [visible, setVisible] = createState(false);

  return (
    <window
      visible={visible}
      name="osd"
      layer={Astal.Layer.OVERLAY}
      gdkmonitor={createBinding(
        hyprland,
        "focused-monitor",
      )((focused: Hyprland.Monitor) => hyprToGdk(focused))}
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
        const setClickThrough = () => {
          self
            .get_native()
            ?.get_surface()
            ?.set_input_region(new giCairo.Region());
        };

        self.connect("realize", setClickThrough);
        onCleanup(() => {
          self.disconnect();
        });
      }}
      application={app}
      keymode={Astal.Keymode.NONE}
      namespace="osd"
    >
      <OnScreenProgress visible={visible} setVisible={setVisible} />
    </window>
  );
}
