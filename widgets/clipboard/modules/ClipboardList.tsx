import { Gtk } from "ags/gtk4";
import { clipboard } from "utils/clipboard";
import GLib from "gi://GLib";

export function ClipboardList() {
  let listBox: Gtk.Box | null = null;

  const rebuild = () => {
    if (!listBox) return;
    let child = listBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      listBox.remove(child);
      child = next;
    }
    if (clipboard.filtered.length === 0) {
      listBox.append(new Gtk.Label({
        label: clipboard.query ? "No matching entries" : "No clipboard entries",
        css_classes: ["no-entries"],
      }));
      return;
    }
    clipboard.filtered.forEach((entry, i) => {
      const button = new Gtk.Button({
        css_classes: ["clipboard-entry", ...(clipboard.index === i ? ["selected"] : [])],
      });
      
      button.connect("clicked", () => {
        clipboard.index = i;
        clipboard.select(i).catch(console.error);
      });

      // GTK4 way to handle mouse enter events
      const motionController = new Gtk.EventControllerMotion();
      motionController.connect("enter", () => {
        if (clipboard.index !== i) {
          clipboard.index = i;
          // Use idle_add to defer the update, avoiding widget destruction during event handling
          GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            clipboard.triggerUpdate();
            return false; // Don't repeat
          });
        }
      });
      button.add_controller(motionController);

      const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
      
      // Extract ID and content, then format as "ID || content"
      const parts = entry.content.split('\t');
      const id = parts[0];
      const content = parts.slice(1).join('\t');
      const displayText = `${id} || ${content.length > 80 ? content.slice(0, 77) + "..." : content}`;
      
      row.append(new Gtk.Label({
        label: displayText,
        ellipsize: 3,
        xalign: 0,
        hexpand: true,
        css_classes: ["entry-text"],
      }));
      if (clipboard.mode === "delete") {
        row.append(new Gtk.Label({ label: "delete_forever", css_classes: ["delete-icon"] }));
      }
      button.set_child(row);
      listBox.append(button);
    });
  };

  clipboard.addUpdateCallback(rebuild);

  return (
    <scrolledwindow cssClasses={["clipboard-list"]} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} hscrollbarPolicy={Gtk.PolicyType.NEVER} maxContentHeight={400} propagateNaturalHeight>
      <box orientation={Gtk.Orientation.VERTICAL} $={(self) => { listBox = self; setTimeout(() => clipboard.load(), 100); }} />
    </scrolledwindow>
  );
}