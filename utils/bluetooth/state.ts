
import { createState } from "ags";
import type { BluetoothAgent } from "./agent.ts";

export const [isExpanded, setIsExpanded] = createState(false);
export const [refreshIntervalId, setRefreshIntervalId] = createState<number | null>(null);
export const [selectedDevice, setSelectedDevice] = createState(null);
export const [isConnecting, setIsConnecting] = createState(false);
export const [errorMessage, setErrorMessage] = createState("");
export const [bluetoothAgent, setBluetoothAgent] = createState<BluetoothAgent | null>(null);
export const [hasBluetoothAgent, setHasBluetoothAgent] = createState(false);

export const resetBluetoothState = () => {
  setIsExpanded(false);
  setSelectedDevice(null);
  setIsConnecting(false);
  setErrorMessage("");
};
