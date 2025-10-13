import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createBinding, With } from "ags";
import { CavaDraw } from "widgets/music/modules/cava";
import { firstActivePlayer } from "utils/mpris.ts";
import options from "options.ts";

function Cover({ player }) {
  let measureBox: Gtk.Widget | null = null;

  return (
    <overlay
      $={(self) => {
        // Set measure overlay after the child is added
        if (measureBox) {
          self.set_measure_overlay(measureBox, true);
        }
      }}
    >
      <box
        cssClasses={["cava-container"]}
        $type="overlay"
        canTarget={false}
        visible={options["bar.modules.media.cava.enable"]}
      >
        <CavaDraw vexpand hexpand style={"circular"} />
      </box>
      <box
        $type="overlay"
        $={(self) => {
          measureBox = self;
        }}
      >
        <image
          cssClasses={["cover"]}
          overflow={Gtk.Overflow.HIDDEN}
          file={createBinding(player, "coverArt")}
        />
      </box>
    </overlay>
  );
}

function Title({ player }) {
  return (
    <label
      cssClasses={["title", "module"]}
      label={createBinding(
        player,
        "metadata",
      )(() => player.title && `${player.artist} - ${player.title}`)}
    />
  );
}

function MusicBox({ player }) {
  return (
    <box>
      <box>
        <Cover player={player} />
      </box>
      <box>
        <Title player={player} />
      </box>
    </box>
  );
}
``;

export default function Media() {
  return (
    <button
      cssClasses={["Media"]}
      onClicked={() => app.toggle_window("music-player")}
    >
      <With value={firstActivePlayer}>
        {(player) => (player ? <MusicBox player={player} /> : "")}
      </With>
    </button>
  );
}
