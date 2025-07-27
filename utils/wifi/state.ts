import { createState } from "ags";

// UI State
export const [isExpanded, setIsExpanded] = createState(false);
export const [showPasswordDialog, setShowPasswordDialog] = createState(false);
export const [passwordInput, setPasswordInput] = createState("");
export const [selectedNetwork, setSelectedNetwork] = createState(null);
export const [isConnecting, setIsConnecting] = createState(false);
export const [errorMessage, setErrorMessage] = createState("");

// Network Data State
export const [availableNetworks, setAvailableNetworks] = createState([]);
export const [savedNetworks, setSavedNetworks] = createState([]);
export const [activeNetwork, setActiveNetwork] = createState(null);

// Scanning State
export const [scanTimer, setScanTimer] = createState(null);
