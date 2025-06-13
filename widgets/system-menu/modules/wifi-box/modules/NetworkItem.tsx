import Pango from "gi://Pango";
import { Gtk } from "astal/gtk4";
import { bind } from "astal";
import {
  activeNetwork,
  savedNetworks,
  selectedNetwork,
  showPasswordDialog,
  passwordInput,
  connectToNetwork,
} from "utils/wifi.ts";
// Network Item component
export const NetworkItem = ({ network }) => {
  const isActive = bind(activeNetwork).as(
    (active) => active?.ssid === network.ssid,
  );

  return (
    <button
      hexpand
      onClicked={() => {
        if (isActive.get()) return; // Already connected

        // Check if the network is already saved
        const isSaved = savedNetworks.get().includes(network.ssid);

        if (network.secured && !isSaved) {
          // Show password dialog only for secured networks that are not saved
          selectedNetwork.set(network);
          showPasswordDialog.set(true);
          passwordInput.set("");
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
        {isActive.get() && (
          <image halign={Gtk.Align.END} iconName="emblem-ok-symbolic" />
        )}
      </box>
    </button>
  );
};
