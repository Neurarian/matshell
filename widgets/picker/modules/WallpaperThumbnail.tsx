import { Gdk, Gtk } from "ags/gtk4";
import { createState, onCleanup, With } from "ags";
import { timeout } from "ags/time";
import Pango from "gi://Pango?version=1.0";
import { PickerCoordinator } from "utils/picker";
import type { WallpaperItem } from "utils/picker/types.ts";
import Adw from "gi://Adw?version=1";

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
              loadImageAsync(item.path!);
            }}
          >
            <With value={texture}>
              {(tex) =>
                tex ? (
                  <Adw.Clamp maximumSize={160}>
                    <Gtk.Picture
                      paintable={tex}
                      width_request={160}
                      cssClasses={["wallpaper-picture"]}
                      contentFit={Gtk.ContentFit.COVER}
                    />
                  </Adw.Clamp>
                ) : (
                  <Adw.Clamp maximumSize={160}>
                    <box
                      width_request={160}
                      cssClasses={["loading-placeholder"]}
                      homogeneous
                    >
                      <Adw.Spinner
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                      />
                    </box>
                  </Adw.Clamp>
                )
              }
            </With>
          </box>
        ) : (
          <></>
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
