import { execAsync } from "ags/process";
import Network from "gi://AstalNetwork";
import {
  setIsConnecting,
  setErrorMessage,
  setShowPasswordDialog,
} from "./state.ts";
import { scanNetworks, getSavedNetworks } from "./scanning.ts";

export const connectToNetwork = async (
  ssid: string,
  password?: string,
): Promise<boolean> => {
  setIsConnecting(true);
  setErrorMessage("");

  const network = Network.get_default();
  const currentSsid = network.wifi.ssid;

  const performConnection = () => {
    return new Promise<boolean>((resolve) => {
      let command = "";
      if (password) {
        command = `echo '${password}' | nmcli device wifi connect "${ssid}" --ask`;
      } else {
        command = `nmcli connection up "${ssid}" || nmcli device wifi connect "${ssid}"`;
      }

      execAsync(["bash", "-c", command])
        .then(() => {
          setShowPasswordDialog(false);
          setIsConnecting(false);
          scanNetworks();
          getSavedNetworks();
          resolve(true);
        })
        .catch((error) => {
          console.error("Connection error:", error);
          setIsConnecting(false);
          setErrorMessage("Check Password");

          // Clean up failed connection attempt
          execAsync([
            "bash",
            "-c",
            `nmcli connection show "${ssid}" 2>/dev/null`,
          ])
            .then((output) => {
              if (output) forgetNetwork(ssid);
            })
            .catch(() => {
              // Network wasn't saved (expected)
            });

          resolve(false);
        });
    });
  };

  // If already connected to a network, disconnect first
  if (currentSsid && currentSsid !== ssid) {
    console.log(
      `Disconnecting from ${currentSsid} before connecting to ${ssid}`,
    );
    try {
      await execAsync(["bash", "-c", `nmcli connection down "${currentSsid}"`]);
      // Wait for clean disconnection
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Disconnect error:", error);
      // Continue with connection attempt even if disconnect fails
    }
  }

  return performConnection();
};

export const disconnectNetwork = async (ssid: string): Promise<boolean> => {
  return new Promise((resolve) => {
    execAsync(["bash", "-c", `nmcli connection down "${ssid}"`])
      .then(() => {
        scanNetworks();
        resolve(true);
      })
      .catch((error) => {
        console.error("Disconnect error:", error);
        resolve(false);
      });
  });
};

export const forgetNetwork = async (ssid: string): Promise<boolean> => {
  return new Promise((resolve) => {
    execAsync(["bash", "-c", `nmcli connection delete "${ssid}"`])
      .then(() => {
        getSavedNetworks();
        scanNetworks();
        resolve(true);
      })
      .catch((error) => {
        console.error("Forget network error:", error);
        resolve(false);
      });
  });
};
