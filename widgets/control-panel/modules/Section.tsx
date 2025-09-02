import { Gtk } from "ags/gtk4";

interface SectionProps {
  title: string;
  children?: JSX.Element | JSX.Element[];
}

export function Section({ title, children }: SectionProps) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <label
        label={title}
        halign={Gtk.Align.CENTER}
        cssClasses={["section-label"]}
      />
      {children}
    </box>
  );
}
