import { Accessor } from "ags";
import { Gtk } from "ags/gtk4";
import { PickerCoordinator } from "utils/picker/PickerCoordinator";

interface CommandSuggestionsProps {
  picker: PickerCoordinator;
}

export function CommandSuggestions({ picker }: CommandSuggestionsProps) {
  const availableCommands = picker.availableProviders.map((command) => {
    const config = picker.getProviderConfig(command);
    return {
      command,
      name: config?.name || command,
      icon: config?.icon || "search",
    };
  });
  return (
    <box cssClasses={["command-suggestions"]}>
      <box
        cssClasses={["commands-list"]}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={4}
      >
        {availableCommands.map((item) => (
          <CommandItem
            command={item.command}
            name={item.name}
            icon={item.icon}
            onClick={() => {
              picker.setActiveProvider(item.command);
            }}
          />
        ))}
      </box>
    </box>
  );
}

interface CommandItemProps {
  command: string;
  name: string;
  icon: string;
  onClick: () => void;
}

function CommandItem({ command, name, icon, onClick }: CommandItemProps) {
  return (
    <button cssClasses={["command-item"]} onClicked={onClick} hexpand>
      <box spacing={4}>
        <label label={icon} cssClasses={["command-icon"]} />
        <box valign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
          <label
            label={`:${command}`}
            cssClasses={["command-name"]}
            halign={Gtk.Align.START}
          />
          <label
            label={name}
            cssClasses={["command-description"]}
            halign={Gtk.Align.START}
          />
        </box>
      </box>
    </button>
  );
}
