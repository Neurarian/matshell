// widgets/sidebar/ClockWidget.tsx
import Gtk from "gi://Gtk?version=4.0";
import { With } from "gnim";
import { createState } from "ags";

/** ---------- State ---------- **/

const [currentTime, setCurrentTime] = createState("00:00:00");
const [currentDate, setCurrentDate] = createState("");

// Format date
function updateDate() {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Update time every second
setInterval(() => {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  setCurrentTime(`${hh}:${mm}:${ss}`);
}, 1000);

// Update date once per minute
setInterval(() => setCurrentDate(updateDate()), 60_000);
// Set initial date
setCurrentDate(updateDate());

/** ---------- Digit Stack ---------- **/

function DigitStack(index: number) {
  return (
    <stack
      class="digit-stack"
      transitionDuration={400}
      transitionType={Gtk.StackTransitionType.SLIDE_UP_DOWN}
      $={(self) => (
        <With value={currentTime}>
          {(time) => {
            const str = time ?? "00:00:00";
            self.visibleChildName = str[index] ?? "0";
            return null;
          }}
        </With>
      )}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <label
          $type="named"
          name={i.toString()}
          label={i.toString()}
          xalign={0.5}
        />
      ))}
    </stack>
  );
}

/** ---------- Widget ---------- **/

export default function ClockWidget() {
  return (
    <box
      class="clock-widget"
      orientation={Gtk.Orientation.VERTICAL}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      spacing={8}
    >
      {/* Time */}
      <box spacing={4} halign={Gtk.Align.CENTER}>
        {DigitStack(0)}
        {DigitStack(1)}
        <label class="colon" label=":" />
        {DigitStack(3)}
        {DigitStack(4)}
        <label class="colon" label=":" />
        {DigitStack(6)}
        {DigitStack(7)}
      </box>

      {/* Divider */}
      <Gtk.Separator orientation={Gtk.Orientation.HORIZONTAL} />

      {/* Date */}
      <With value={currentDate}>
        {(date) => (
          <label class="date-label" label={date} halign={Gtk.Align.CENTER} />
        )}
      </With>
    </box>
  );
}
