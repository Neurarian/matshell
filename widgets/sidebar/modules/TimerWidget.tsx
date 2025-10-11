// widgets/sidebar/modules/TimerWidget.tsx
import { Gtk } from "ags/gtk4";
import { createState, With } from "ags";
import { timerService, Timer } from "utils/timer";

function TimerItem({ timer }: { timer: Timer }) {
  return (
    <box
      cssClasses={["timer-item"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
    >
      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          hexpand
          valign={Gtk.Align.CENTER}
        >
          <With value={timerService.getTimers()}>
            {(timers) => {
              const currentTimer = timers.find((t) => t.id === timer.id);
              if (!currentTimer) return null;
              
              return (
                <label
                  label={timerService.formatTime(currentTimer.remaining)}
                  cssClasses={currentTimer.running ? ["timer-time", "timer-active"] : ["timer-time"]}
                  halign={Gtk.Align.START}
                />
              );
            }}
          </With>
        </box>

        <box orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
          <With value={timerService.getTimers()}>
            {(timers) => {
              const currentTimer = timers.find((t) => t.id === timer.id);
              if (!currentTimer) return null;

              return currentTimer.running ? (
                <button
                  cssClasses={["timer-button", "timer-button-stop"]}
                  tooltipText="Stop"
                  onClicked={() => timerService.stopTimer(timer.id)}
                >
                  <label label="Pause" cssClasses={["timer-button-icon"]} />
                </button>
              ) : (
                <button
                  cssClasses={["timer-button", "timer-button-start"]}
                  tooltipText="Start"
                  onClicked={() => timerService.startTimer(timer.id)}
                >
                  <label label="Play_Arrow" cssClasses={["timer-button-icon"]} />
                </button>
              );
            }}
          </With>
          
          <button
            cssClasses={["timer-button", "timer-button-reset"]}
            tooltipText="Reset"
            onClicked={() => timerService.resetTimer(timer.id)}
          >
            <label label="Refresh" cssClasses={["timer-button-icon"]} />
          </button>

          <button
            cssClasses={["timer-button", "timer-button-delete"]}
            tooltipText="Delete"
            onClicked={() => timerService.removeTimer(timer.id)}
          >
            <label label="Delete" cssClasses={["timer-button-icon"]} />
          </button>
        </box>
      </box>

      <With value={timerService.getTimers()}>
        {(timers) => {
          const currentTimer = timers.find((t) => t.id === timer.id);
          if (!currentTimer) return null;
          
          const progress = (currentTimer.remaining / currentTimer.duration) * 100;
          return (
            <box cssClasses={["timer-progress-container"]}>
              <box
                cssClasses={["timer-progress-bar"]}
                css={`min-width: ${progress}%;`}
              />
            </box>
          );
        }}
      </With>
    </box>
  );
}

function TimePickerColumn({ 
  label, 
  valueState, 
  max, 
  onChange 
}: { 
  label: string; 
  valueState: ReturnType<typeof createState<number>>; 
  max: number; 
  onChange: (val: number) => void;
}) {
  const items = Array.from({ length: max + 1 }, (_, i) => i);

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
      <label 
        label={label} 
        cssClasses={["time-picker-label"]}
        halign={Gtk.Align.CENTER}
      />
      <scrolledwindow
        cssClasses={["time-picker-scroll"]}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        minContentHeight={120}
        maxContentHeight={120}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
          <With value={valueState}>
            {(currentValue) => (
              <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                {items.map((num) => (
                  <button
                    cssClasses={
                      num === currentValue
                        ? ["time-picker-item", "time-picker-item-active"]
                        : ["time-picker-item"]
                    }
                    onClicked={() => onChange(num)}
                  >
                    <label label={num.toString().padStart(2, "0")} />
                  </button>
                ))}
              </box>
            )}
          </With>
        </box>
      </scrolledwindow>
    </box>
  );
}

export default function TimerWidget() {
  const [showDialog, setShowDialog] = createState(false);
  const [hours, setHours] = createState(0);
  const [minutes, setMinutes] = createState(5);
  const [seconds, setSeconds] = createState(0);

  const handleAdd = () => {
    const totalSeconds = hours.get() * 3600 + minutes.get() * 60 + seconds.get();
    
    if (totalSeconds > 0) {
      timerService.addTimer("Timer", totalSeconds / 60);
      setHours(0);
      setMinutes(5);
      setSeconds(0);
      setShowDialog(false);
    }
  };

  return (
    <box
      class="timer-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
    >
      {/* Widget Header - matches other widgets pattern */}
      <box
        class="widget-header"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={8}
      >
        <label
          label="Timer"
          cssClasses={["header-icon"]}
        />
        <label
          label="Timers"
          cssClasses={["header-title"]}
          halign={Gtk.Align.START}
          hexpand
        />
      </box>

      <Gtk.Separator />

      {/* Add Timer Button */}
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <button
          cssClasses={["timer-add-button"]}
          onClicked={() => setShowDialog(!showDialog.get())}
        >
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
            <label label="Add_Circle" cssClasses={["timer-add-icon"]} />
            <label label="New Timer" />
          </box>
        </button>

        {/* Timer Creation Dialog */}
        <With value={showDialog}>
          {(show) => {
            if (!show) return null;
            
            return (
              <box
                cssClasses={["timer-dialog"]}
                orientation={Gtk.Orientation.VERTICAL}
                spacing={12}
              >
                <label
                  label="Set Duration"
                  cssClasses={["dialog-title"]}
                  halign={Gtk.Align.CENTER}
                />

                <box 
                  orientation={Gtk.Orientation.HORIZONTAL} 
                  spacing={8}
                  cssClasses={["time-picker-container"]}
                  homogeneous
                >
                  <TimePickerColumn
                    label="hours"
                    valueState={hours}
                    max={23}
                    onChange={setHours}
                  />
                  <TimePickerColumn
                    label="min"
                    valueState={minutes}
                    max={59}
                    onChange={setMinutes}
                  />
                  <TimePickerColumn
                    label="sec"
                    valueState={seconds}
                    max={59}
                    onChange={setSeconds}
                  />
                </box>

                <box
                  orientation={Gtk.Orientation.HORIZONTAL}
                  spacing={8}
                  homogeneous
                >
                  <button
                    cssClasses={["dialog-button", "dialog-button-cancel"]}
                    onClicked={() => setShowDialog(false)}
                  >
                    <label label="Cancel" />
                  </button>
                  <button
                    cssClasses={["dialog-button", "dialog-button-confirm"]}
                    onClicked={handleAdd}
                  >
                    <label label="Start" />
                  </button>
                </box>
              </box>
            );
          }}
        </With>
      </box>

      {/* Timer List */}
      <box
        class="timer-list"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={8}
      >
        <With value={timerService.getTimers()}>
          {(timers) => {
            if (timers.length === 0) {
              return (
                <box
                  cssClasses={["timer-empty"]}
                  orientation={Gtk.Orientation.VERTICAL}
                  spacing={8}
                  valign={Gtk.Align.CENTER}
                >
                  <label
                    label="Alarm"
                    cssClasses={["empty-icon"]}
                  />
                  <label
                    label="No timers yet"
                    cssClasses={["empty-text"]}
                  />
                </box>
              );
            }

            return (
              <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                {timers.map((timer) => <TimerItem timer={timer} />)}
              </box>
            );
          }}
        </With>
      </box>
    </box>
  );
}