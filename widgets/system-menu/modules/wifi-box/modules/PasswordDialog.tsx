import { Gtk } from "ags/gtk4";
import {
  selectedNetwork,
  setShowPasswordDialog,
  passwordInput,
  setPasswordInput,
  connectToNetwork,
  errorMessage,
  setErrorMessage,
  isConnecting,
  scanTimer,
  setScanTimer,
} from "utils/wifi.ts";

export const PasswordDialog = () => {
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
          onClicked={() => {
            setShowPasswordDialog(false);
            setErrorMessage("");
          }}
        />
      </box>
    </box>
  );
};
