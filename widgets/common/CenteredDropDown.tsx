import { Gtk } from "ags/gtk4";
import { onCleanup } from "ags";

interface CenteredDropDownProps<T extends string = string> {
  options: readonly { readonly value: T; readonly label: string }[];
  selected?: T;
  onSelected: (value: T) => void;
  cssClasses?: string[];
}

export function CenteredDropDown<T extends string = string>({
  options,
  selected,
  onSelected,
  cssClasses = ["dropdown"],
}: CenteredDropDownProps<T>) {
  return (
    <Gtk.DropDown
      model={Gtk.StringList.new(options.map((o) => o.label))}
      cssClasses={cssClasses}
      onNotifySelected={(self) => {
        const selectedIndex = self.selected;
        const selectedOption = options[selectedIndex];
        if (selectedOption) {
          onSelected(selectedOption.value);
        }
      }}
      $={(self) => {
        const initialIndex = selected
          ? options.findIndex((opt) => opt.value === selected)
          : 0;

        if (initialIndex !== -1) {
          self.set_selected(initialIndex);
        } else {
          self.set_selected(0);
        }

        const factory = Gtk.SignalListItemFactory.new();
        const signalIds: number[] = [];

        const setupId = factory.connect(
          "setup",
          (_factory, listItem: Gtk.ListItem) => {
            const label = new Gtk.Label({
              halign: Gtk.Align.CENTER,
            });
            listItem.set_child(label);
          },
        );
        signalIds.push(setupId);

        const bindId = factory.connect(
          "bind",
          (_factory, listItem: Gtk.ListItem) => {
            const label = listItem.get_child() as Gtk.Label;
            const stringObject = listItem.get_item() as Gtk.StringObject;
            if (label && stringObject) {
              label.set_label(stringObject.get_string());
            }
          },
        );
        signalIds.push(bindId);

        self.set_factory(factory);

        onCleanup(() => {
          signalIds.forEach((id) => factory.disconnect(id));
        });
      }}
    />
  );
}
