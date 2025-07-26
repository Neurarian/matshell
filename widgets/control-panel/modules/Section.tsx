import { Gtk } from "ags/gtk4";

export function Section({ title, children }) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <label label={title} halign={Gtk.Align.CENTER} cssClasses={["section-label"]} />
      {children}
    </box>
  );
}
