import { Gtk } from "ags/gtk4";
import { clipboard } from "utils/clipboard";

export function SearchSection() {
  let searchEntry: any = null;
  clipboard.focusSearch = () => searchEntry?.grab_focus();

  return (
    <box cssClasses={["search-section"]} orientation={Gtk.Orientation.HORIZONTAL}>
      <label label="search" cssClasses={["search-icon"]} />
      <entry $={(self) => { searchEntry = self; }} placeholderText="Type to search clipboard..." text={clipboard.query} onChanged={({ text }) => clipboard.search(text || "")} cssClasses={["search-entry"]} hexpand />
      <label label="Tab: Toggle Mode" cssClasses={["shortcut-hint"]} />
    </box>
  );
}