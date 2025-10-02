import { Gtk } from "ags/gtk4";
import { createBinding, createComputed } from "ags";
import { Accessor } from "ags";
import Pango from "gi://Pango";
import { PickerCoordinator } from "utils/picker";
import type { PickerItem } from "utils/picker/types.ts";

interface ItemButtonProps {
  item: PickerItem;
  picker: PickerCoordinator;
  index: Accessor<number>;
}

export function ItemButton({ item, picker, index }: ItemButtonProps) {
  const config = picker.currentConfig;
  const selectedIndex = createBinding(picker, "selectedIndex");
  const hasNavigated = createBinding(picker, "hasNavigated");

  return (
    <box>
      <button
        cssClasses={createComputed(
          [selectedIndex, hasNavigated],
          (s, n): string[] =>
            s === index.get() && n
              ? ["app-button", "selected"]
              : ["app-button"],
        )}
        onClicked={() => picker.activate(item)}
        hexpand
      >
        <box spacing={4}>
          {item.iconName && (
            <image iconName={item.iconName || "image-x-generic"} />
          )}
          <box valign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
            <label
              cssClasses={["name"]}
              ellipsize={Pango.EllipsizeMode.END}
              halign={Gtk.Align.START}
              label={item.name}
            />
            {item.description && (
              <label
                cssClasses={["description"]}
                wrap
                halign={Gtk.Align.START}
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
