import { Gtk } from "ags/gtk4";
import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";
import { isIcon } from "utils/notifd";

export function PlayerInfo({ player }: { player: Mpris.Player }) {
  const { END } = Gtk.Align;
  return (
    <box cssClasses={["player-info"]} halign={END}>
      <image
        cssClasses={["player-icon"]}
        halign={END}
        tooltipText={createBinding(player, "identity")}
        iconName={createBinding(
          player,
          "entry",
        )((entry) => {
          if (entry === "spotify") entry = "spotify-client";
          return isIcon(entry ?? "") ? entry : "multimedia-player-symbolic";
        })}
      />
    </box>
  );
}
