import { execAsync } from "ags/process";
import app from "ags/gtk4/app";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import { createState } from "ags";
import { gdkmonitor, currentMonitorWidth } from "utils/monitors.ts";

function hide() {
  app.get_window("logout-menu")!.hide();
}

function LogoutButton(label: string, command: string) {
  return (
    <button onClicked={() => execAsync(["sh", "-c", command])} label={label} />
  );
}

export default function LogoutMenu() {
  const [visible, _setVisible] = createState(false);

  return (
    <window
      name="logout-menu"
      visible={visible}
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
    >
      <Gtk.EventControllerKey
        onKeyPressed={({ widget }, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            widget.hide();
          }
        }}
      />
      <box cssClasses={["logout-background"]}>
        <button
          widthRequest={currentMonitorWidth((w) => w / 2)}
          onClicked={hide}
        />
        <box
          hexpand={false}
          orientation={Gtk.Orientation.VERTICAL}
          valign={Gtk.Align.CENTER}
        >
          <button onClicked={hide} />
          <box
            cssClasses={["logout-menu"]}
            orientation={Gtk.Orientation.VERTICAL}
          >
            <box>
              {LogoutButton("lock", "hyprlock")}
              {LogoutButton("bedtime", "systemctl suspend || loginctl suspend")}
              {LogoutButton(
                "logout",
                "pkill Hyprland || loginctl terminate-user $USER",
              )}
            </box>
            <box>
              {LogoutButton(
                "power_settings_new",
                "systemctl poweroff || loginctl poweroff",
              )}
              {LogoutButton(
                "mode_standby",
                "systemctl hibernate || loginctl hibernate",
              )}
              {LogoutButton(
                "restart_alt",
                "systemctl reboot || loginctl reboot",
              )}
            </box>
          </box>
          <button onClicked={hide} />
        </box>
        <button
          widthRequest={currentMonitorWidth((w) => w / 2)}
          onClicked={hide}
        />
      </box>
    </window>
  );
}
