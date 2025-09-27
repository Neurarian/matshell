import { Gdk, Gtk } from "ags/gtk4";
import { createState, onCleanup, With } from "ags";
import { timeout } from "ags/time";
import Pango from "gi://Pango?version=1.0";
import { PickerCoordinator } from "utils/picker";
import type { WallpaperItem } from "utils/picker/types.ts";

interface WallpaperThumbnailProps {
  item: WallpaperItem;
  picker: PickerCoordinator;
  onActivate: () => void;
}

export function WallpaperThumbnail({
  item,
  picker,
  onActivate,
}: WallpaperThumbnailProps) {
  const [texture, setTexture] = createState<Gdk.Texture | null>(null);

  onCleanup(() => {
    setTexture(null);
  });

  const loadImageAsync = async (imagePath: string) => {
    try {
      const cachedTexture = await picker.getThumbnail(imagePath);
      if (cachedTexture) {
        setTexture(cachedTexture);
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for ${item.name}:`, error);
    }
  };

  return (
    <button cssClasses={["wallpaper-thumbnail"]} onClicked={onActivate}>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
        {item.path ? (
          <box
            cssClasses={["wallpaper-preview-container"]}
            onRealize={() => {
              timeout(20, () => {
                loadImageAsync(item.path!);
              });
            }}
          >
            <With value={texture}>
              {(tex) =>
                tex ? (
                  <Gtk.Picture
                    paintable={tex}
                    cssClasses={["wallpaper-picture"]}
                    contentFit={Gtk.ContentFit.COVER}
                  />
                ) : (
                  <box hexpand cssClasses={["loading-placeholder"]} />
                )
              }
            </With>
          </box>
        ) : (
          <box cssClasses={["wallpaper-placeholder"]} />
        )}

        <label
          label={item.name}
          ellipsize={Pango.EllipsizeMode.END}
          maxWidthChars={15}
          cssClasses={["wallpaper-name"]}
          xalign={0.5}
        />
      </box>
    </button>
  );
}
