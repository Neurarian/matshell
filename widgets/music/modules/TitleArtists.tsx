import { Gtk } from "ags/gtk4";
import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";

export function Title({ player }: { player: Mpris.Player }) {
  return (
    <Gtk.ScrolledWindow
      cssClasses={["title"]}
      vexpand={true}
      heightRequest={12}
      vscrollbarPolicy={Gtk.PolicyType.NEVER}
      hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
    >
      <label
        cssClasses={["title"]}
        label={createBinding(player, "title")((t) => t || "Nothing playing")}
      />
    </Gtk.ScrolledWindow>
  );
}

export function Artists({ player }: { player: Mpris.Player }) {
  return (
    <Gtk.ScrolledWindow
      cssClasses={["artists"]}
      vexpand={true}
      vscrollbarPolicy={Gtk.PolicyType.NEVER}
      hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
    >
      <label
        cssClasses={["artists"]}
        label={createBinding(player, "artist")((a) => a || "")}
      />
    </Gtk.ScrolledWindow>
  );
}
