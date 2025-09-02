import { Gtk } from "ags/gtk4";
import options from "options.ts";

interface OptionToggleProps {
  option: string;
  label: string;
  icon?: string | null;
}

export function OptionToggle({
  option,
  label,
  icon = null,
}: OptionToggleProps) {
  return (
    <box cssClasses={["option-row", "option-toggle"]}>
      {icon && <image iconName={icon} cssClasses={["option-icon"]} />}
      <label
        label={label}
        halign={Gtk.Align.START}
        hexpand={true}
        cssClasses={["option-label"]}
      />
      <switch
        cssClasses={["option-switch"]}
        active={options[option]((value) => Boolean(value))}
        onNotifyActive={(self) => {
          console.log(`Toggle ${option} changed to: ${self.active}`);
          options[option].value = self.active;
        }}
      />
    </box>
  );
}
