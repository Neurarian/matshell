import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import Mpris from "gi://AstalMpris";
import { createBinding, createState, With } from "ags";
import Gio from "gi://Gio?version=2.0";
import { findPlayer, generateBackground } from "utils/mpris";
import { Cover } from "./modules/Cover";
import { Info } from "./modules/Info";
import { CavaDraw } from "./modules/cava";
import options from "options.ts";

function MusicBox({ player }: { player: Mpris.Player }) {
  let measureBox: Gtk.Box | null = null;

  return (
    <overlay
      $={(self) => {
        // Set measure overlay after the child is added
        if (measureBox) {
          self.set_measure_overlay(measureBox, true);
        }
      }}
    >
      <Gtk.ScrolledWindow $type="overlay">
        <Gtk.Picture
          cssClasses={["blurred-cover"]}
          file={createBinding(
            player,
            "cover_art",
          )((c) => Gio.file_new_for_path(generateBackground(c)))}
          contentFit={Gtk.ContentFit.COVER}
        />
      </Gtk.ScrolledWindow>
      <box
        cssClasses={["cava-container"]}
        $type="overlay"
        canTarget={false}
        visible={options["musicPlayer.modules.cava.show"]((value) =>
          Boolean(value),
        )}
      >
        <CavaDraw
          hexpand
          vexpand
          style={options["musicPlayer.modules.cava.style"]((value) =>
            String(value),
          )}
        />
      </box>
      <box
        $type="overlay"
        $={(self) => {
          measureBox = self;
        }}
      >
        <Cover player={player} />
        <Info player={player} />
      </box>
    </overlay>
  );
}

export default function MusicPlayer() {
  const mpris = Mpris.get_default();
  const { TOP, BOTTOM } = Astal.WindowAnchor;
  const [visible, _setVisible] = createState(false);
  return (
    <window
      name="music-player"
      cssClasses={["music", "window"]}
      application={app}
      layer={Astal.Layer.OVERLAY}
      anchor={options["bar.position"]((pos) => {
        switch (pos) {
          case "top":
            return TOP;
          case "bottom":
            return BOTTOM;
          default:
            return TOP;
        }
      })}
      keymode={Astal.Keymode.ON_DEMAND}
      visible={visible}
    >
      <box>
        <With value={createBinding(mpris, "players")}>
          {(players: Mpris.Player[]) =>
            players.length > 0 ? (
              <MusicBox player={findPlayer(players)} />
            ) : null
          }
        </With>
      </box>
    </window>
  );
}
