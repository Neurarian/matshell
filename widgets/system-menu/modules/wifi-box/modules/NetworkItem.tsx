import Pango from "gi://Pango";
import { Gtk } from "ags/gtk4";
import {
  activeNetwork,
  savedNetworks,
  setSelectedNetwork,
  setShowPasswordDialog,
  setPasswordInput,
  connectToNetwork,
} from "utils/wifi.ts";

export const NetworkItem = ({ network }) => {

  const isActive = activeNetwork((active) => active?.ssid === network.ssid);

  return (
    <button
      hexpand
      onClicked={() => {
        if (isActive.get()) return;

        const isSaved = savedNetworks.get().includes(network.ssid);

        if (network.secured && !isSaved) {
          // Show password dialog only for secured networks that are not saved
          setSelectedNetwork(network);
          setShowPasswordDialog(true);
          setPasswordInput("");
        } else {
          // Directly connect to: 1) open networks, or 2) saved networks
          connectToNetwork(network.ssid);
        }
      }}
    >
      <box cssClasses={["network-item"]} hexpand>
        <image iconName={network.iconName} />
        <label
          label={network.ssid}
          maxWidthChars={18}
          ellipsize={Pango.EllipsizeMode.END}
        />
        <box hexpand={true} />
        {network.secured && (
          <image
            halign={Gtk.Align.END}
            iconName="network-wireless-encrypted-symbolic"
          />
        )}
        <image
          halign={Gtk.Align.END}
          iconName="object-select-symbolic"
          visible={isActive}
        />
      </box>
    </button>
  );
};
