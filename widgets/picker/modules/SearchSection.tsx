import { createBinding, With } from "ags";
import { PickerCoordinator } from "utils/picker/PickerCoordinator.ts";

interface SearchSectionProps {
  picker: PickerCoordinator;
}

export function SearchSection({ picker }: SearchSectionProps) {
  const searchText = createBinding(picker, "searchText");
  const activeProvider = createBinding(picker, "activeProvider");

  return (
    <With value={activeProvider}>
      {() => {
        const config = picker.currentConfig;

        return (
          <box cssClasses={["search"]}>
            <label label={config?.icon || "search"} />
            <entry
              $={(self) => (picker.searchEntry = self)}
              placeholderText={config?.placeholder || "Search..."}
              text={searchText}
              onNotifyText={(self) => picker.setSearchText(self.text)}
              primaryIconSensitive={true}
              onActivate={() => picker.activateFirstResult()}
              hexpand={true}
            />
          </box>
        );
      }}
    </With>
  );
}
