import { Gtk } from "ags/gtk4";
import Pango from "gi://Pango";
import { PickerCoordinator } from "utils/picker";
import type { PickerItem } from "utils/picker/types.ts";

interface ItemButtonProps {
  item: PickerItem;
  picker: PickerCoordinator;
}

export function ItemButton({ item, picker }: ItemButtonProps) {
  return (
    <button cssClasses={["AppButton"]} onClicked={() => picker.activate(item)}>
      <box>
        <image iconName={item.iconName || "image-x-generic"} />
        <box valign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
          <label
            cssClasses={["name"]}
            ellipsize={Pango.EllipsizeMode.END}
            xalign={0}
            label={item.name}
          />
          {item.description && (
            <label
              cssClasses={["description"]}
              wrap
              xalign={0}
              label={item.description}
            />
          )}
        </box>
      </box>
    </button>
  );
}
