import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";
import { createBinding } from "ags";
import Hyprland from "gi://AstalHyprland";

import { hyprToGdk } from "utils/hyprland";
import OnScreenProgress from "./modules/Progress.tsx";
import options from "options.ts";

export default function OnScreenDisplay() {
  const { TOP, BOTTOM } = Astal.WindowAnchor;
  const hyprland = Hyprland.get_default();

  return (
    <window
      visible
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
      application={app}
      keymode={Astal.Keymode.ON_DEMAND}
      namespace="osd"
    >
      <OnScreenProgress />
    </window>
  );
}
