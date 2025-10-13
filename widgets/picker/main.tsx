import app from "ags/gtk4/app";
import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding } from "ags";
import { gdkmonitor, currentMonitorWidth } from "utils/monitors.ts";
import { picker } from "utils/picker/";
import { SearchSection } from "./modules/SearchSection.tsx";
import { ModeBar } from "./modules/ModeBar.tsx";
import { ResultsRenderer } from "./modules/ResultsRenderer.tsx";
import Adw from "gi://Adw?version=1";

interface PickerLayoutProps {
  children: JSX.Element[];
  onClickOutside: () => void;
}

function PickerLayout({ children, onClickOutside }: PickerLayoutProps) {
  const { CENTER } = Gtk.Align;

  return (
    <Adw.Clamp maximumSize={600}>
      <box>
        <button
          widthRequest={currentMonitorWidth((w) => w / 2)}
          onClicked={onClickOutside}
          cssClasses={["invisible-close"]}
        />
        <box
          hexpand={false}
          orientation={Gtk.Orientation.VERTICAL}
          valign={CENTER}
        >
          <button onClicked={onClickOutside} cssClasses={["invisible-close"]} />
          <box
            widthRequest={600}
            cssClasses={["picker"]}
            orientation={Gtk.Orientation.VERTICAL}
          >
            {children}
          </box>
        </box>

        <button
          widthRequest={currentMonitorWidth((w) => w / 2)}
          onClicked={onClickOutside}
          cssClasses={["invisible-close"]}
        />
      </box>
    </Adw.Clamp>
  );
}

export default function PickerWindow() {
  return (
    <window
      name="picker"
      visible={createBinding(picker, "isVisible")}
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      $={(self) => {
        picker.window = self;
      }}
      onNotifyVisible={({ visible }) => {
        visible ? picker.focusSearch() : picker.clearSearch();
      }}
    >
      <Gtk.EventControllerKey
        propagationPhase={Gtk.PropagationPhase.BUBBLE}
        onKeyPressed={(_controller, keyval, _keycode, state) => {
          const controlMod = (state & Gdk.ModifierType.CONTROL_MASK) !== 0;
          return picker.handleKeyPress({
            key: keyval,
            controlMod,
          });
        }}
      />

      <PickerLayout onClickOutside={() => picker.hide()}>
        <ModeBar picker={picker} />
        <SearchSection picker={picker} />
        <ResultsRenderer picker={picker} />
      </PickerLayout>
    </window>
  );
}
