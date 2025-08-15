import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";
import { Gtk } from "ags/gtk4";
import { lengthStr } from "utils/mpris";

function PositionLabel({ player }: { player: Mpris.Player }) {
  return (
    <label
      cssClasses={["position"]}
      xalign={0}
      label={createBinding(
        player,
        "position",
      )((pos) => (player.length > 0 ? lengthStr(pos) : ""))}
    ></label>
  );
}

function LengthLabel({ player }: { player: Mpris.Player }) {
  return (
    <label
      cssClasses={["length"]}
      xalign={1}
      hexpand={true}
      visible={createBinding(player, "length")((l) => l > 0)}
      label={createBinding(player, "length")(lengthStr)}
    />
  );
}

function Position({ player }: { player: Mpris.Player }) {
  const length = createBinding(player, "length");

  return (
    <slider
      cssClasses={["position"]}
      hexpand={true}
      visible={length((l) => l > 0)}
      value={createBinding(player, "position")}
      max={length}
      onChangeValue={({ value }) => {
        player.setPosition?.(value) ?? (player.position = value);
      }}
    />
  );
}

export function TimeInfo({ player }: { player: Mpris.Player }) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} vexpand={true}>
      <box hexpand={true}>
        <PositionLabel player={player} />
        <LengthLabel player={player} />
      </box>
      <Position player={player} />
    </box>
  );
}
