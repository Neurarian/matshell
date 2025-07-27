import { Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import {
  selectedNetwork,
  setShowPasswordDialog,
  passwordInput,
  setPasswordInput,
  errorMessage,
  setErrorMessage,
  isConnecting,
  scanTimer,
  setScanTimer,
  connectToNetwork,
} from "utils/wifi";

export const PasswordDialog = () => {
  // Cancel handler with window resize
  const handleCancel = () => {
    setShowPasswordDialog(false);
    setErrorMessage("");
    const window = app.get_window("system-menu");
    if (window) {
      window.set_default_size(-1, -1);
    }
  };

  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      cssClasses={["password-dialog"]}
    >
      <label
        label={selectedNetwork((sn) => (sn ? sn.ssid : ""))}
        cssClasses={["password-label"]}
      />
      <box cssClasses={["password-search"]}>
        <image iconName="network-wireless-encrypted-symbolic" />
        <entry
          placeholderText="Enter Password..."
          visibility={false}
          text={passwordInput}
          onNotifyText={(self) => {
            setPasswordInput(self.text);
            scanTimer.get()?.cancel();
            setScanTimer(null);
          }}
          onActivate={() =>
            connectToNetwork(selectedNetwork.get()?.ssid, passwordInput.get())
          }
        />
      </box>
      <box visible={errorMessage((e) => e !== "")}>
        <label label={errorMessage} hexpand cssClasses={["error-message"]} />
      </box>
      <box>
        <button
          label={isConnecting((c) => (c ? "Connecting..." : "Connect"))}
          cssClasses={["connect-button", "button"]}
          sensitive={isConnecting((c) => !c)}
          onClicked={() =>
            connectToNetwork(selectedNetwork.get()?.ssid, passwordInput.get())
          }
        />
        <button
          label="Cancel"
          halign={Gtk.Align.END}
          hexpand
          cssClasses={["cancel-button", "button"]}
          onClicked={handleCancel}
        />
      </box>
    </box>
  );
};
