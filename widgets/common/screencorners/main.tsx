import { Astal, Gdk } from "ags/gtk4";
import Cairo from "gi://cairo";
import app from "ags/gtk4/app";
import { onCleanup } from "ags";
import options from "options.ts";

function getAnchor(positionAccessor: (typeof options)["bar.position"]) {
  const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;
  return positionAccessor((pos) => {
    switch (pos) {
      case "top":
        return TOP | LEFT | RIGHT;
      case "bottom":
        return BOTTOM | LEFT | RIGHT;
      case "left":
        return LEFT | BOTTOM | TOP;
      case "right":
        return RIGHT | BOTTOM | TOP;
      default:
        return TOP | LEFT | RIGHT;
    }
  });
}
export default function ScreenCorners({ monitor }: { monitor: Gdk.Monitor }) {
  return (
    <window
      name={options["bar.position"](
        (pos) => `screen-corner-${pos || "top"}-${monitor.get_model()}`,
      )}
      namespace="bar"
      cssClasses={options["bar.position"]((pos) => [
        "ScreenCorners",
        `corner-${pos || "top"}`,
      ])}
      gdkmonitor={monitor}
      visible={options["bar.style"]((style) => style === "corners")}
      anchor={getAnchor(options["bar.position"])}
      application={app}
      keymode={Astal.Keymode.NONE}
      $={(self) => {
        const surface = self.get_native()?.get_surface();
        if (surface) {
          surface.set_input_region(new Cairo.Region());
        }
        onCleanup(() => self.destroy());
      }}
    >
      <box cssClasses={["corner-content"]} />
    </window>
  );
}
