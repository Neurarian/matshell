import { Gtk } from "ags/gtk4";
import { PickerCoordinator } from "utils/picker";
import { CenteredDropDown } from "widgets/common/CenteredDropDown.tsx";
import {
  THEME_MODE_OPTIONS,
  THEME_SCHEME_OPTIONS,
  type ThemeMode,
  type ThemeScheme,
} from "utils/wallpaper/types";
import type { WallpaperProvider } from "utils/picker/providers/WallpaperProvider";
import type { ISearchProvider } from "utils/picker/types";

interface ThemeControlsProps {
  picker: PickerCoordinator;
}

// Type guard
function isThemeProvider(
  provider: ISearchProvider | undefined,
): provider is ISearchProvider & WallpaperProvider {
  return (
    provider !== undefined &&
    "ThemeMode" in provider &&
    "ThemeScheme" in provider
  );
}

export function ThemeControls({ picker }: ThemeControlsProps) {
  const provider = picker.currentProvider;

  if (!isThemeProvider(provider)) {
    return <box hexpand />;
  }

  //TODO: Implement an apply button instead of running this onSelected everytime
  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={12}
      cssClasses={["theme-controls"]}
      hexpand
      halign={Gtk.Align.CENTER}
    >
      <box cssClasses={["option-row"]}>
        <label
          label="Mode: "
          cssClasses={["option-label"]}
          halign={Gtk.Align.START}
        />
        <CenteredDropDown<ThemeMode>
          options={THEME_MODE_OPTIONS}
          selected={provider.ThemeMode}
          onSelected={(value) => {
            provider.ThemeMode = value;
          }}
          cssClasses={["dropdown"]}
        />
      </box>

      <box cssClasses={["option-row"]}>
        <label
          label="Scheme: "
          cssClasses={["option-label"]}
          halign={Gtk.Align.START}
        />
        <CenteredDropDown<ThemeScheme>
          options={THEME_SCHEME_OPTIONS}
          selected={provider.ThemeScheme}
          onSelected={(value) => {
            provider.ThemeScheme = value;
          }}
          cssClasses={["dropdown"]}
        />
      </box>
    </box>
  );
}
