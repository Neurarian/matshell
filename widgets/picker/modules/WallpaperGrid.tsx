import { Gtk } from "ags/gtk4";
import { PickerCoordinator } from "utils/picker";
import type { WallpaperItem } from "utils/picker/types.ts";
import { WallpaperThumbnail } from "./WallpaperThumbnail.tsx";

interface WallpaperGridProps {
  items: WallpaperItem[];
  picker: PickerCoordinator;
}

export function WallpaperGrid({ items, picker }: WallpaperGridProps) {
  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      cssClasses={["wallpaper-content"]}
    >
      {Array.from({ length: Math.ceil(items.length / 3) }, (_, rowIndex) => (
        <box
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={8}
          cssClasses={["wallpaper-row"]}
        >
          {items
            .slice(rowIndex * 3, (rowIndex + 1) * 3)
            .map((item, colIndex) => {
              const itemIndex = rowIndex * 3 + colIndex;
              return (
                <WallpaperThumbnail
                  item={item}
                  picker={picker}
                  itemIndex={itemIndex}
                  onActivate={() => picker.activate(item)}
                />
              );
            })}
        </box>
      ))}
    </box>
  );
}
