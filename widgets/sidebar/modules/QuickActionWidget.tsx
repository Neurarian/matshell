// widgets/sidebar/modules/QuickActionsWidget.tsx
import { Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { execAsync } from "ags/process";
import options from "options";

interface ActionItem {
  label: string;
  icon: string;
  action: () => void;
}

function ActionButton({ label, icon, action }: ActionItem) {
  return (
    <button
      cssClasses={["action-button"]}
      onClicked={action}
      tooltipText={label}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
        <label label={icon} cssClasses={["action-icon"]} />
      </box>
    </button>
  );
}

export default function QuickActionsWidget() {
  const actions: ActionItem[] = [
    {
      label: "Apps",
      icon: "Apps",
      action: () => app.toggle_window("picker"),
    },
    {
      label: "Terminal",
      icon: "Terminal",
      action: () =>
        execAsync(String(options["app.terminal"].get())).catch(console.error),
    },
    {
      label: "Files",
      icon: "Folder",
      action: () =>
        execAsync(String(options["app.file-manager"].get())).catch(
          console.error,
        ),
    },
    {
      label: "Browser",
      icon: "Captive_Portal",
      action: () =>
        execAsync(String(options["app.browser"].get())).catch(console.error),
    },
  ];

  return (
    <box
      class="quick-actions-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
      visible={options["sidebar.quick-actions.enable"]}
    >
      <box
        class="actions-grid"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={8}
        homogeneous
      >
        {actions.map((action) => (
          <ActionButton {...action} />
        ))}
      </box>
    </box>
  );
}
