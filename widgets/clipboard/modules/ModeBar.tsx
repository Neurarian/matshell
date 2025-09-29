import { Gtk } from "ags/gtk4";
import { clipboard } from "utils/clipboard";

export function ModeBar() {
  let entryCountLabel: any = null;
  let selectButton: any = null;
  let deleteButton: any = null;
  let clearAllButton: any = null;

  const updateButtons = () => {
    if (selectButton && deleteButton && clearAllButton) {
      selectButton.cssClasses = clipboard.mode === "select" ? ["mode-button", "active"] : ["mode-button"];
      deleteButton.cssClasses = clipboard.mode === "delete" ? ["mode-button", "active"] : ["mode-button"];
      clearAllButton.visible = clipboard.mode === "delete";
    }
  };

  const updateEntryCount = () => {
    if (entryCountLabel) {
      const count = clipboard.filtered.length;
      entryCountLabel.label = `${count} ${count === 1 ? 'entry' : 'entries'}`;
    }
  };

  // Store the original onUpdate callback if it exists
  const originalOnUpdate = clipboard.onUpdate;
  
  // Add our callback to the callback system instead of overwriting
  clipboard.addUpdateCallback(() => {
    updateEntryCount();
    updateButtons();
  });

  // If there was an original callback, make sure it still works
  if (originalOnUpdate && typeof originalOnUpdate === 'function') {
    clipboard.addUpdateCallback(originalOnUpdate);
  }

  return (
    <box cssClasses={["mode-bar"]} orientation={Gtk.Orientation.HORIZONTAL}>
      <button 
        cssClasses={["mode-button", "active"]} 
        onClicked={() => { 
          clipboard.mode = "select"; 
          updateButtons(); 
        }} 
        $={(self) => { selectButton = self; }}
      >
        <box orientation={Gtk.Orientation.HORIZONTAL}>
          <label label="content_copy" cssClasses={["mode-icon"]} />
          <label label="Select" />
        </box>
      </button>
      <button 
        cssClasses={["mode-button"]} 
        onClicked={() => { 
          clipboard.mode = "delete"; 
          updateButtons(); 
        }} 
        $={(self) => { deleteButton = self; }}
      >
        <box orientation={Gtk.Orientation.HORIZONTAL}>
          <label label="delete" cssClasses={["mode-icon"]} />
          <label label="Delete" />
        </box>
      </button>
      <box hexpand />
      <button 
        cssClasses={["clear-all-button"]} 
        visible={false}
        onClicked={() => clipboard.clearAll()}
        $={(self) => { clearAllButton = self; }}
      >
        <box orientation={Gtk.Orientation.HORIZONTAL}>
          <label label="delete_history" cssClasses={["mode-icon"]} />
          <label label="Clear All" />
        </box>
      </button>
      <label 
        label="0 entries" 
        cssClasses={["entry-count"]} 
        $={(self) => { entryCountLabel = self; }} 
      />
    </box>
  );
}