import { Gtk } from "ags/gtk4";
import { With } from "ags";
import { currentDate, currentTimeString } from "utils/time";

function DigitStack(index: number) {
  return (
    <stack
      class="digit-stack"
      transitionDuration={400}
      transitionType={Gtk.StackTransitionType.SLIDE_UP_DOWN}
      $={(self) => (
        <With value={currentTimeString}>
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
          halign={Gtk.Align.CENTER}
        />
      ))}
    </stack>
  );
}

function TimeDisplay() {
  return (
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
  );
}

function DateDisplay() {
  return (
    <With value={currentDate}>
      {(date) => (
        <label class="date-label" label={date} halign={Gtk.Align.CENTER} />
      )}
    </With>
  );
}

export default function ClockWidget() {
  return (
    <box
      class="clock-widget"
      orientation={Gtk.Orientation.VERTICAL}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      spacing={8}
    >
      <TimeDisplay />
      <Gtk.Separator orientation={Gtk.Orientation.HORIZONTAL} />
      <DateDisplay />
    </box>
  );
}
