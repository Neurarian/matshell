import { createState } from "ags";
import { Timer } from "ags/time";
import { NetworkInfo } from "./types.ts";

// UI State
export const [isExpanded, setIsExpanded] = createState(false);
export const [showPasswordDialog, setShowPasswordDialog] = createState(false);
export const [passwordInput, setPasswordInput] = createState("");
export const [selectedNetwork, setSelectedNetwork] =
  createState<NetworkInfo | null>(null);
export const [isConnecting, setIsConnecting] = createState(false);
export const [errorMessage, setErrorMessage] = createState("");

// Network Data State
export const [availableNetworks, setAvailableNetworks] = createState<
  NetworkInfo[]
>([]);
export const [savedNetworks, setSavedNetworks] = createState<string[]>([]);
export const [activeNetwork, setActiveNetwork] =
  createState<NetworkInfo | null>(null);

// Scanning State
export const [scanTimer, setScanTimer] = createState<Timer | null>(null);
