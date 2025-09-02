import { Gtk } from "ags/gtk4";
import options from "options.ts";

interface OptionSelectProps {
  option: string;
  label: string;
  choices: string[];
}

export function OptionSelect({
  option,
  label,
  choices = [],
}: OptionSelectProps) {
  return (
    <box cssClasses={["option-row", "option-select"]}>
      <label
        label={label}
        halign={Gtk.Align.START}
        hexpand={true}
        cssClasses={["option-label"]}
      />
      <Gtk.ComboBoxText
        cssClasses={["option-dropdown"]}
        onChanged={(self) => {
          const selectedText = self.get_active_text();
          if (selectedText) {
            options[option].value = selectedText;
          }
        }}
        $={(self) => {
          // Populate items
          choices.forEach((choice) => {
            self.append_text(choice);
          });
          const currentValue = String(options[option].get());
          const initialIndex = choices.indexOf(currentValue);

          if (initialIndex !== -1) {
            self.set_active(initialIndex);
          } else {
            self.set_active(0);
            if (choices.length > 0) {
              options[option].value = choices[0];
            }
          }
        }}
      />
    </box>
  );
}
