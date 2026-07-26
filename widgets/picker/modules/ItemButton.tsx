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

function impactTier(impactFactor?: number): string {
  if (!impactFactor) return "if-none";
  if (impactFactor >= 20) return "if-high";
  if (impactFactor >= 5) return "if-medium";
  return "if-low";
}

export function ItemButton({ item, picker, index }: ItemButtonProps) {
  const features = picker.currentProvider?.features;
  const selectedIndex = createBinding(picker, "selectedIndex");
  const hasNavigated = createBinding(picker, "hasNavigated");
  const showImpactBadge =
    item.kind === "rss" && item.impactFactor !== undefined;

  return (
    <box>
      <button
        cssClasses={createComputed([selectedIndex, hasNavigated], (s, n) =>
          s === index.get() && n ? ["app-button", "selected"] : ["app-button"],
        )}
        onClicked={() => picker.activate(item)}
        hexpand
      >
        <box spacing={4}>
          {item.iconName && (
            <image iconName={item.iconName || "image-x-generic"} />
          )}
          <box
            valign={Gtk.Align.CENTER}
            orientation={Gtk.Orientation.VERTICAL}
            hexpand
          >
            <box cssClasses={["title-row"]} spacing={6}>
              <label
                cssClasses={["name"]}
                ellipsize={Pango.EllipsizeMode.END}
                halign={Gtk.Align.START}
                label={item.name}
                hexpand
              />
              {showImpactBadge && (
                <label
                  cssClasses={["impact-badge", impactTier(item.impactFactor)]}
                  label={`IF ${item.impactFactor!.toFixed(1)}`}
                  halign={Gtk.Align.END}
                />
              )}
            </box>
            {item.description && (
              <label
                cssClasses={["description"]}
                wrap
                ellipsize={Pango.EllipsizeMode.END}
                halign={Gtk.Align.START}
                label={item.description}
              />
            )}
          </box>
        </box>
      </button>
      {features?.delete && (
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
