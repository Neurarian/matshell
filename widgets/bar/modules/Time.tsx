// widgets/bar/modules/Time.tsx
import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createState } from "ags";
import { currentTimeString } from "utils/time";

export default function Time() {
  const [revealPower, setRevealPower] = createState(false);

  const timeLabel = currentTimeString((time) => {
    const [hours, minutes] = time.split(":");
    return `${hours} 󰇙 ${minutes}`;
  });

  return (
    <box
      $={(self) => {
        const motionController = new Gtk.EventControllerMotion();

        motionController.connect("enter", () => {
          setRevealPower(true);
        });

        motionController.connect("leave", () => {
          setRevealPower(false);
        });

        self.add_controller(motionController);
      }}
    >
      <label cssClasses={["clock"]} label={timeLabel} />
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
