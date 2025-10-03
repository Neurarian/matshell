import { createBinding } from "ags";
import Network from "gi://AstalNetwork";

export default function Net() {
  const getNetIcon = (net) => {
    if (net.primary == 1) return "network-wired-symbolic";

    if (net.wifi?.icon_name) return net.wifi.icon_name;
    return "network-error-symbolic";
  };

  const getNetText = (conn, net) => {
    // no connection
    if (conn == 0) return "Unknown connection";
    if (conn == 1) return "No connection";

    // wired
    if (net.primary == 1) return "Wired";

    // wifi
    const wifi = net.wifi;
    switch (wifi.internet) {
      case 0:
        return wifi.ssid;
      case 1:
        return "Connecting";
      case 2:
        return "Disconnected";
    }
  };
  const network = Network.get_default();
  return (
    <image
      cssClasses={["net", "module"]}
      iconName={createBinding(
        network,
        "connectivity",
      )(() => `${getNetIcon(network)}`)}
      tooltipText={createBinding(
        network,
        "connectivity",
      )((connectivity) => `${getNetText(connectivity, network)}`)}
    />
  );
}
