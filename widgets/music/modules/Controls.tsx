import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";
import { mprisStateIcon } from "utils/mpris";

export function Controls({
  player,
  widthRequest,
}: {
  player: Mpris.Player;
  widthRequest?: number;
}) {
  return (
    <centerbox
      cssClasses={["controls"]}
      vexpand={true}
      hexpand={false}
      widthRequest={widthRequest}
    >
      <button onClicked={() => player.previous()} $type="start">
        <image iconName="media-skip-backward-symbolic" />
      </button>
      <button onClicked={() => player.play_pause()} $type="center">
        <image
          iconName={createBinding(player, "playback_status")(mprisStateIcon)}
        />
      </button>
      <button onClicked={() => player.next()} $type="end">
        <image iconName="media-skip-forward-symbolic" />
      </button>
    </centerbox>
  );
}
