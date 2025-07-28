import { execAsync } from "ags/process";
import Network from "gi://AstalNetwork";
import {
  setAvailableNetworks,
  setSavedNetworks,
  setActiveNetwork,
} from "./state.ts";
import type { NetworkInfo } from "./types.ts";

export const scanNetworks = () => {
  const network = Network.get_default();
  if (network && network.wifi) {
    network.wifi.scan();

    // Get available networks from access points
    const networks = network.wifi.accessPoints
      .map((ap) => ({
        ssid: ap.ssid,
        strength: ap.strength,
        secured: ap.flags !== 0,
        active: network.wifi.activeAccessPoint?.ssid === ap.ssid,
        accessPoint: ap,
        iconName: ap.iconName,
      }))
      .filter((n) => n.ssid);

    // Sort by signal strength
    networks.sort((a, b) => b.strength - a.strength);

    // Remove duplicates (same SSID)
    const uniqueNetworks: NetworkInfo[] = [];
    const seen = new Set();
    networks.forEach((network) => {
      if (!seen.has(network.ssid)) {
        seen.add(network.ssid);
        uniqueNetworks.push(network);
      }
    });

    setAvailableNetworks(uniqueNetworks);

    // Update active network
    network.wifi.activeAccessPoint
      ? setActiveNetwork({
          ssid: network.wifi.activeAccessPoint.ssid,
          strength: network.wifi.activeAccessPoint.strength,
          secured: network.wifi.activeAccessPoint.flags !== 0,
        })
      : setActiveNetwork(null);
  }
};

export const getSavedNetworks = () => {
  execAsync(["bash", "-c", "nmcli -t -f NAME,TYPE connection show"])
    .then((output) => {
      if (typeof output === "string") {
        const savedWifiNetworks = output
          .split("\n")
          .filter((line) => line.includes("802-11-wireless"))
          .map((line) => line.split(":")[0].trim());
        setSavedNetworks(savedWifiNetworks);
      }
    })
    .catch((error) => console.error("Error fetching saved networks:", error));
};
