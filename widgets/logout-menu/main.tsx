import { execAsync } from "ags/process";
import app from "ags/gtk4/app";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import { createState } from "ags";

function hide() {
  app.get_window("logout-menu")!.hide();
}

function LogoutButton(label: String, command: String) {
  return (
    <button onClicked={() => execAsync(["sh", "-c", command])} label={label} />
  );
}

export default function LogoutMenu() {
  const [winWidth, setWinWidth] = createState(1000);
  const [visible, _setVisible] = createState(false);

  return (
    <window
      name="logout-menu"
      visible={visible}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      onShow={(self) => {
        setWinWidth(self.get_current_monitor().geometry.width);
      }}
    >
      <Gtk.EventControllerKey
        onKeyPressed={({ widget }, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            widget.hide();
          }
        }}
      />
      <box cssClasses={["logout-background"]}>
        <button widthRequest={winWidth((w) => w / 2)} onClicked={hide} />
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
        <button widthRequest={winWidth((w) => w / 2)} onClicked={hide} />
      </box>
    </window>
  );
}
