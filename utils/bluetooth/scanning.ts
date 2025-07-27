import Bluetooth from "gi://AstalBluetooth";

export const scanDevices = (): boolean => {
  const bluetooth = Bluetooth.get_default();
  if (bluetooth?.adapter) {
    try {
      bluetooth.adapter.start_discovery();
      console.log("Started Bluetooth device discovery");
      return true;
    } catch (error) {
      console.error("Failed to start discovery:", error);
      return false;
    }
  }
  console.warn("No Bluetooth adapter available");
  return false;
};

export const stopScan = (): boolean => {
  const bluetooth = Bluetooth.get_default();
  if (bluetooth?.adapter) {
    try {
      bluetooth.adapter.stop_discovery();
      console.log("Stopped Bluetooth device discovery");
      return true;
    } catch (error) {
      console.error("Failed to stop discovery:", error);
      return false;
    }
  }
  return false;
};

export const isScanning = (): boolean => {
  const bluetooth = Bluetooth.get_default();
  return bluetooth?.adapter?.discovering || false;
};
