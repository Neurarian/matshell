// State management
export {
  isExpanded,
  setIsExpanded,
  refreshIntervalId,
  setRefreshIntervalId,
  selectedDevice,
  setSelectedDevice,
  isConnecting,
  setIsConnecting,
  errorMessage,
  setErrorMessage,
  bluetoothAgent,
  hasBluetoothAgent,
  resetBluetoothState,
} from "./state.ts";

// Formatting utilities
export {
  bluetoothIcon,
  bluetoothTooltip,
  getBluetoothDeviceText,
  getDeviceStatusText,
} from "./formatting.ts";

// Agent management
export {
  BluetoothAgent,
  startBluetoothAgent,
  ensureBluetoothAgent,
  stopBluetoothAgent,
} from "./agent.ts";

// Scanning operations
export { scanDevices, stopScan, isScanning } from "./scanning.ts";

// Centralized Device Manager
export { BluetoothDeviceManager, createDeviceManager } from "./manager.ts";
