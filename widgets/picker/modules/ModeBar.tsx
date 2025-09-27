import { createBinding, With } from "ags";
import { PickerCoordinator } from "utils/picker/PickerCoordinator.ts";

interface ModeBarProps {
  picker: PickerCoordinator;
}

export function ModeBar({ picker }: ModeBarProps) {
  const activeProvider = createBinding(picker, "activeProvider");

  return (
    <box cssClasses={["mode-bar"]} spacing={4}>
      {picker.availableProviders.map((providerCommand) => (
        <With value={activeProvider}>
          {(active) => {
            const config = picker.getProviderConfig(providerCommand);
            const isActive = active === providerCommand;

            return (
              <button
                cssClasses={["mode-button", ...(isActive ? ["active"] : [])]}
                onClicked={() => picker.setActiveProvider(providerCommand)}
              >
                <box spacing={4}>
                  <label
                    label={config?.icon || providerCommand}
                    cssClasses={["mode-icon"]}
                  />
                  <label label={config?.name || providerCommand} />
                </box>
              </button>
            );
          }}
        </With>
      ))}
    </box>
  );
}
