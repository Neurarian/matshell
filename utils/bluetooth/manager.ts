import { createBinding, createComputed } from "ags";
import { timeout } from "ags/time";
import Bluetooth from "gi://AstalBluetooth";
import type { BluetoothIconType } from "./types.ts";
import { setIsConnecting, hasBluetoothAgent } from "./state.ts";
import { ensureBluetoothAgent, stopBluetoothAgent } from "./agent.ts";

export class BluetoothDeviceManager {
  private device: Bluetooth.Device;

  constructor(device: Bluetooth.Device) {
    this.device = device;
  }

  async connect(): Promise<boolean> {
    if (!this.canConnect.get()) return false;

    return new Promise((resolve) => {
      setIsConnecting(true);
      this.device.connect_device(() => {
        setIsConnecting(false);
        const success = this.device.connected;
        console.log(
          `Connection ${success ? "successful" : "failed"} for ${this.device.name}`,
        );
        resolve(success);
      });
    });
  }

  async disconnect(): Promise<boolean> {
    return new Promise((resolve) => {
      this.device.disconnect_device(() => {
        const success = !this.device.connected;
        console.log(
          `Disconnection ${success ? "successful" : "failed"} for ${this.device.name}`,
        );
        resolve(success);
      });
    });
  }

  async pair(): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Start agent if not running
      let agentWasStarted = false;
      if (!hasBluetoothAgent.get()) {
        try {
          const agentStarted = await ensureBluetoothAgent();
          if (!agentStarted) {
            console.error("Failed to start Bluetooth agent");
            resolve(false);
            return;
          }
          agentWasStarted = true;
        } catch (error) {
          console.error("Error starting Bluetooth agent:", error);
          resolve(false);
          return;
        }
      }

      // Create a binding for the paired state
      const pairedBinding = createBinding(this.device, "paired");
      let resolved = false;

      // Set up cleanup to run when paired becomes true
      const unsubscribe = pairedBinding.subscribe(() => {
        const paired = pairedBinding.get();
        if (paired && !resolved) {
          resolved = true;
          console.log(`Successfully paired with ${this.device.name}`);
          unsubscribe();

          // Stop the agent when paired
          if (agentWasStarted) {
            console.log("Pairing successful, stopping Bluetooth agent");
            timeout(1000, async () => {
              try {
                await stopBluetoothAgent();
              } catch (error) {
                console.error("Error stopping Bluetooth agent:", error);
              }
            });
          }
          resolve(true);
        }
      });

      // Set up timeout for pairing process
      timeout(30000, async () => {
        if (!resolved) {
          resolved = true;
          console.log("Pairing timeout reached");
          unsubscribe();
          if (agentWasStarted) {
            try {
              await stopBluetoothAgent();
            } catch (error) {
              console.error(
                "Error stopping Bluetooth agent after timeout:",
                error,
              );
            }
          }
          resolve(false);
        }
      });

      try {
        console.log(`Initiating pairing with ${this.device.name}`);
        this.device.pair();
      } catch (error) {
        if (!resolved) {
          resolved = true;
          console.error("Error pairing device:", error);
          unsubscribe();
          if (agentWasStarted) {
            try {
              await stopBluetoothAgent();
            } catch (stopError) {
              console.error(
                "Error stopping Bluetooth agent after pairing error:",
                stopError,
              );
            }
          }
          resolve(false);
        }
      }
    });
  }

  unpair(): boolean {
    const bluetooth = Bluetooth.get_default();
    if (bluetooth?.adapter) {
      try {
        bluetooth.adapter.remove_device(this.device);
        console.log(`Unpaired device: ${this.device.name}`);
        return true;
      } catch (error) {
        console.error("Error unpairing device:", error);
        return false;
      }
    }
    return false;
  }

  toggleTrust(): boolean {
    try {
      const newTrustState = !this.device.trusted;
      this.device.set_trusted(newTrustState);
      console.log(
        `${this.device.name} trust: ${newTrustState ? "enabled" : "disabled"}`,
      );
      return true;
    } catch (error) {
      console.error("Error toggling device trust:", error);
      return false;
    }
  }

  get isConnected() {
    return createBinding(this.device, "connected");
  }

  get isPaired() {
    return createBinding(this.device, "paired");
  }

  get isTrusted() {
    return createBinding(this.device, "trusted");
  }

  get isConnecting() {
    return createBinding(this.device, "connecting");
  }

  get batteryPercentage() {
    return createBinding(this.device, "battery_percentage");
  }

  get displayInfo() {
    return createComputed(
      [this.isConnected, this.batteryPercentage],
      (connected, battery) => ({
        name: this.device.name || "Unknown Device",
        batteryText:
          connected && battery > 0 ? ` ${Math.round(battery * 100)}%` : "",
        isConnected: connected,
      }),
    );
  }

  get canConnect() {
    return createComputed(
      [this.isPaired, this.isConnecting],
      (paired, connecting) => paired && !connecting,
    );
  }

  get connectionIcon() {
    return createComputed(
      [this.isConnected, this.isConnecting],
      (connected, connecting): BluetoothIconType => {
        if (connected) return "bluetooth-active-symbolic";
        if (connecting) return "bluetooth-acquiring-symbolic";
        return "bluetooth-disconnected-symbolic";
      },
    );
  }

  get trustIcon() {
    return this.isTrusted((trusted) =>
      trusted ? "security-high-symbolic" : "security-low-symbolic",
    );
  }

  get pairIcon() {
    return this.isPaired((paired) =>
      paired ? "network-transmit-receive-symbolic" : "network-offline-symbolic",
    );
  }

  get connectionClasses() {
    return this.isConnected((connected) =>
      connected
        ? ["network-item", "network-item-connected"]
        : ["network-item", "network-item-disconnected"],
    );
  }

  get connectionTooltip() {
    return this.isConnected((connected) =>
      connected ? "Disconnect" : "Connect",
    );
  }

  get trustTooltip() {
    return this.isTrusted((trusted) => (trusted ? "Untrust" : "Trust"));
  }

  get pairTooltip() {
    return this.isPaired((paired) => (paired ? "Unpair" : "Pair"));
  }
}

export const createDeviceManager = (device: Bluetooth.Device) => {
  return new BluetoothDeviceManager(device);
};
