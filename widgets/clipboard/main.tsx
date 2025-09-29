import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { gdkmonitor, currentMonitorWidth } from "utils/monitors.ts";
import { clipboard } from "utils/clipboard";
import { SearchSection } from "./modules/SearchSection.tsx";
import { ModeBar } from "./modules/ModeBar.tsx";
import { ClipboardList } from "./modules/ClipboardList.tsx";
import Adw from "gi://Adw?version=1";

function ClipboardLayout({ children, onClickOutside }) {
  return (
    <Adw.Clamp maximumSize={600}>
      <box>
        <button widthRequest={currentMonitorWidth((w) => w / 2)} onClicked={onClickOutside} cssClasses={["invisible-close"]} />
        <box hexpand={false} orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
          <button onClicked={onClickOutside} cssClasses={["invisible-close"]} />
          <box widthRequest={600} cssClasses={["clipboard"]} orientation={Gtk.Orientation.VERTICAL}>
            {children}
          </box>
        </box>
        <button widthRequest={currentMonitorWidth((w) => w / 2)} onClicked={onClickOutside} cssClasses={["invisible-close"]} />
      </box>
    </Adw.Clamp>
  );
}

export default function ClipboardWindow() {
  return (
    <window
      name="clipboard"
      visible={clipboard.isVisible}
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      $={(self) => { 
        clipboard.window = self;
        
        // Watch for visibility changes and refresh clipboard when shown
        self.connect("notify::visible", () => {
          console.log(`Window visibility changed: ${self.visible}`);
          if (self.visible) {
            console.log("Window became visible - refreshing clipboard...");
            clipboard.load().catch(console.error);
          }
        });
      }}
    >
      <Gtk.EventControllerKey onKeyPressed={({}, keyval) => { clipboard.key(keyval); return true; }} />
      <ClipboardLayout onClickOutside={() => clipboard.hide()}>
        <ModeBar />
        <ClipboardList />
        <SearchSection />
      </ClipboardLayout>
    </window>
  );
}