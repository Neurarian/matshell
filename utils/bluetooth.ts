import Bluetooth from "gi://AstalBluetooth";
import { startBluetoothAgent, BluetoothAgent } from "./bluetooth-agent.ts";
import { Variable, bind, timeout } from "astal";

export const isExpanded = Variable(false);
export const refreshIntervalId = Variable(null);
export const selectedDevice = Variable(null);
export const isConnecting = Variable(false);
export const errorMessage = Variable("");
const bluetoothAgent = Variable<BluetoothAgent | null>(null);
const hasBluetoothAgent = Variable(false);

export const getBluetoothIcon = (bt: Bluetooth.Bluetooth) => {
  if (!bt.is_powered) return "bluetooth-disabled-symbolic";
  if (bt.is_connected) return "bluetooth-active-symbolic";
  return "bluetooth-disconnected-symbolic";
};

export const getBluetoothText = (bt: Bluetooth.Bluetooth) => {
  if (!bt.is_powered) return "Bluetooth off";
  return "Bluetooth on";
};

export const getBluetoothDeviceText = (device) => {
  {
    let battery_str = "";
    if (device.connected && device.battery_percentage > 0) {
      battery_str = ` ${device.battery_percentage * 100}%`;
    }
    return `${device.name} ${battery_str}`;
  }
};

export const ensureBluetoothAgent = () => {
  if (bluetoothAgent.get() === null) {
    console.log("Starting Bluetooth agent");
    bluetoothAgent.set(startBluetoothAgent());
  }
};

export const stopBluetoothAgent = () => {
  const agent = bluetoothAgent.get();
  if (agent) {
    console.log("Stopping Bluetooth agent");
    if (agent.unregister()) {
      console.log("Bluetooth agent stopped successfully");
      bluetoothAgent.set(null);
      hasBluetoothAgent.set(false);
      return true;
    } else {
      console.error("Failed to stop Bluetooth agent");
      return false;
    }
  }
  return true; // No agent running
};

// Scanning functions
export const scanDevices = () => {
  const bluetooth = Bluetooth.get_default();
  if (bluetooth && bluetooth.adapter) {
    bluetooth.adapter.start_discovery();
  }
};

export const stopScan = () => {
  const bluetooth = Bluetooth.get_default();
  if (bluetooth && bluetooth.adapter) {
    bluetooth.adapter.stop_discovery();
  }
};

// Device interaction functions
export const connectToDevice = (device) => {
  if (!device) return;

  isConnecting.set(true);
  device.connect_device(() => {
    isConnecting.set(false);
  });
};

export const disconnectDevice = (device) => {
  if (!device) return;

  device.disconnect_device(() => {
    console.log(`Successfully disconnected with ${device.name}`);
  });
};

export const pairDevice = (device) => {
  if (!device) return;

  // Start agent if not running
  let agentWasStarted = false;
  if (!hasBluetoothAgent.get()) {
    ensureBluetoothAgent();
    agentWasStarted = true;
  }

  // Create a binding for the paired state
  const pairedBinding = bind(device, "paired");

  // Set up cleanup to run when paired becomes true
  const unsubscribe = pairedBinding.subscribe((paired) => {
    if (paired) {
      console.log(`Successfully paired with ${device.name}`);

      // Unsubscribe to prevent memory leaks
      unsubscribe();

      // Stop the agent when paired
      if (agentWasStarted) {
        console.log("Pairing successful, stopping Bluetooth agent");
        timeout(1000, () => {
          stopBluetoothAgent();
        });
      }
    }
  });

  // Set up timeout for pairing process
  timeout(30000, () => {
    console.log("Pairing timeout reached");
    unsubscribe();

    if (agentWasStarted) {
      stopBluetoothAgent();
    }
  });

  try {
    console.log(`Initiating pairing with ${device.name}`);
    device.pair();
  } catch (error) {
    console.error("Error pairing device:", error);
    unsubscribe();

    if (agentWasStarted) {
      stopBluetoothAgent();
    }
  }
};

export const unpairDevice = (device) => {
  const bluetooth = Bluetooth.get_default();
  if (bluetooth && bluetooth.adapter) {
    bluetooth.adapter.remove_device(device);
  }
};

export const toggleTrust = (device) => {
  if (!device) return;
  device.set_trusted(!device.trusted);
};
