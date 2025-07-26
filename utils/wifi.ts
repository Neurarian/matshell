import { execAsync } from "ags/process";
import { createState } from "ags";
import Network from "gi://AstalNetwork";

// State trackers
export const [availableNetworks, setAvailableNetworks] = createState([]);
export const [savedNetworks, setSavedNetworks] = createState([]);
export const [activeNetwork, setActiveNetwork] = createState(null);
export const [isConnecting, setIsConnecting] = createState(false);
export const [showPasswordDialog, setShowPasswordDialog] = createState(false);
export const [errorMessage, setErrorMessage] = createState("");
export const [isExpanded, setIsExpanded] = createState(false);
export const [passwordInput, setPasswordInput] = createState("");
export const [selectedNetwork, setSelectedNetwork] = createState(null);
export const [scanTimer, setScanTimer] = createState(null);

// Function to scan for available networks
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
    const uniqueNetworks = [];
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

// Function to list saved networks
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

// Function to connect to a network
export const connectToNetwork = (ssid, password = null) => {
  setIsConnecting(true);
  setErrorMessage("");
  const network = Network.get_default();
  const currentSsid = network.wifi.ssid;

  const performConnection = () => {
    let command = "";
    password
      ? (command = `echo '${password}' | nmcli device wifi connect "${ssid}" --ask`)
      : (command = `nmcli connection up "${ssid}" || nmcli device wifi connect "${ssid}"`);

    execAsync(["bash", "-c", command])
      .then(() => {
        setShowPasswordDialog(false);
        setIsConnecting(false);
        scanNetworks();
        getSavedNetworks();
      })
      .catch((error) => {
        console.error("Connection error:", error);
        setIsConnecting(false);
        setErrorMessage("Check Password");

        // Immediately remove network again when the connection failed
        execAsync(["bash", "-c", `nmcli connection show "${ssid}" 2>/dev/null`])
          .then((output) => {
            output && forgetNetwork(ssid);
          })
          .catch(() => {
            // Network wasn't saved (desired)
          });
      });
  };

  // If already connected to a network, disconnect first
  if (currentSsid && currentSsid !== ssid) {
    console.log(
      `Disconnecting from ${currentSsid} before connecting to ${ssid}`,
    );
    execAsync(["bash", "-c", `nmcli connection down "${currentSsid}"`])
      .then(() => {
        // Wait a moment for the disconnection to complete fully
        setTimeout(() => {
          performConnection();
        }, 500); // 500ms delay for clean disconnection
      })
      .catch((error) => {
        console.error("Disconnect error:", error);
        // Continue with connection attempt even if disconnect fails
        performConnection();
      });
  } else {
    // No active connection or connecting to same network (reconnect case)
    performConnection();
  }
};

// Function to disconnect from a network
export const disconnectNetwork = (ssid) => {
  execAsync(["bash", "-c", `nmcli connection down "${ssid}"`])
    .then(() => {
      scanNetworks();
    })
    .catch((error) => {
      console.error("Disconnect error:", error);
    });
};

// Function to forget a saved network
export const forgetNetwork = (ssid) => {
  execAsync(["bash", "-c", `nmcli connection delete "${ssid}"`])
    .then(() => {
      getSavedNetworks();
      scanNetworks();
    })
    .catch((error) => {
      console.error("Forget network error:", error);
    });
};
