import { Gtk } from "ags/gtk4";
import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";

export function Cover({ player }: { player: Mpris.Player }) {
  return (
    <image
      cssClasses={["cover"]}
      overflow={Gtk.Overflow.HIDDEN}
      file={createBinding(player, "coverArt")}
    />
  );
}
