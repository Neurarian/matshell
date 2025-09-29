import { Gtk } from "ags/gtk4";
import Pango from "gi://Pango";
import { PickerCoordinator } from "utils/picker";
import type { PickerItem } from "utils/picker/types.ts";

interface ItemButtonProps {
  item: PickerItem;
  picker: PickerCoordinator;
}

export function ItemButton({ item, picker }: ItemButtonProps) {
  const config = picker.currentConfig;
  const hasActions = config?.features?.refresh || config?.features?.random;

  return (
    <box>
      <button
        cssClasses={["app-button"]}
        onClicked={() => picker.activate(item)}
        hexpand
      >
        <box>
          {item.iconName && (
            <image iconName={item.iconName || "image-x-generic"} />
          )}
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
      {config?.features?.delete && (
        <box>
          <button
            cssClasses={["action-button"]}
            tooltipText={"Delete item"}
            onClicked={() => picker.delete(item)}
          >
            <label label="Delete_Forever" cssClasses={["action-icon"]} />
          </button>
        </box>
      )}
    </box>
  );
}
