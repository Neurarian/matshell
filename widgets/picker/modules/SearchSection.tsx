import { createBinding } from "ags";
import { PickerCoordinator } from "utils/picker/PickerCoordinator.ts";

interface SearchSectionProps {
  picker: PickerCoordinator;
}

export function SearchSection({ picker }: SearchSectionProps) {
  const searchText = createBinding(picker, "searchText");
  const placeholderText = createBinding(picker, "placeholderText");
  const icon = createBinding(picker, "searchIcon");

  return (
    <box cssClasses={["search"]}>
      <label label={icon} />
      <entry
        $={(self) => (picker.searchEntry = self)}
        text={searchText}
        placeholderText={placeholderText}
        onNotifyText={(self) => picker.setSearchText(self.text)}
        hexpand
        onActivate={() => picker.activateSelectedResult()}
      />
    </box>
  );
}
