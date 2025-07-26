import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import { interval } from "ags/time";
import { createState } from "ags";

export default function Time() {
  const [time, setTime] = createState("");
  const [revealPower, setRevealPower] = createState(false);

  interval(1000, () => {
    execAsync(["date", "+%H 󰇙 %M"])
      .then((val) => setTime(val.trim()))
      .catch(console.error);
  });

  return (
    <box
      $={(self) => {
        // Create motion event controller
        const motionController = new Gtk.EventControllerMotion();

        // Handle mouse enter
        motionController.connect("enter", () => {
          setRevealPower(true);
        });

        // Handle mouse leave
        motionController.connect("leave", () => {
          setRevealPower(false);
        });

        // Add controller to the widget
        self.add_controller(motionController);
      }}
    >
      <label cssClasses={["clock"]} label={time} />
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        transitionDuration={300}
        revealChild={revealPower}
      >
        <button
          cssClasses={["power-button"]}
          onClicked={() => app.toggle_window("logout-menu")}
        >
          <image iconName="system-shutdown-symbolic" />
        </button>
      </revealer>
    </box>
  );
}
