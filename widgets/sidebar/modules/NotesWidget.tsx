import { Gtk } from "ags/gtk4";
import { createState, onCleanup } from "ags";
import { timeout } from "ags/time";
import options from "options";

export default function NotesWidget() {
  const textBuffer = new Gtk.TextBuffer();
  const [charCount, setCharCount] = createState(0);

  // Load saved notes from persistent cache on init
  const savedNotes = options["notes.content"].get();
  if (savedNotes) {
    textBuffer.set_text(savedNotes, -1);
    setCharCount(savedNotes.length);
  }

  let saveTimeout: ReturnType<typeof timeout> | null = null;

  const debouncedSave = (text: string) => {
    if (saveTimeout) {
      saveTimeout.cancel();
    }
    saveTimeout = timeout(1000, () => {
      options["notes.content"].value = text;
    });
  };

  const signalId = textBuffer.connect("changed", () => {
    const [start, end] = [
      textBuffer.get_start_iter(),
      textBuffer.get_end_iter(),
    ];
    const text = textBuffer.get_text(start, end, true);
    setCharCount(text.length);
    debouncedSave(text);
  });

  onCleanup(() => {
    textBuffer.disconnect(signalId);
    if (saveTimeout) {
      saveTimeout.cancel();
    }
  });

  return (
    <box
      class="notes-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
    >
      <box
        class="notes-header"
        orientation={Gtk.Orientation.HORIZONTAL}
        tooltipText="⚠️Stored unencrypted in ~/.cache/ags/options.json"
        spacing={6}
      >
        <label label="Notes" class="header-title" hexpand />
      </box>

      <Gtk.Separator />

      <scrolledwindow
        minContentHeight={140}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        cssClasses={["notes-scroll"]}
      >
        <Gtk.TextView
          buffer={textBuffer}
          wrapMode={Gtk.WrapMode.WORD_CHAR}
          acceptsTab={false}
          editable={true}
          cssClasses={["notes-textview"]}
        />
      </scrolledwindow>

      <box class="notes-footer" orientation={Gtk.Orientation.HORIZONTAL}>
        <button
          cssClasses={["notes-clear-button", "button-disabled"]}
          tooltipText="Clear all notes"
          label="Delete_Forever"
          onClicked={() => {
            textBuffer.set_text("", -1);
            options["notes.content"].value = "";
          }}
        />
        <label
          cssClasses={["notes-char-count"]}
          label={charCount((count) => `${count} characters`)}
          halign={Gtk.Align.END}
          hexpand
        />
      </box>
    </box>
  );
}
