import { Service, iface, method } from "ags/dbus";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import {
  bluetoothAgent,
  setBluetoothAgent,
  setHasBluetoothAgent,
} from "./state.ts";

const AGENT_PATH = "/org/bluez/agent";
const CAPABILITY = "NoInputNoOutput";
const BLUEZ_SERVICE = "org.bluez";
const AGENT_MANAGER_INTERFACE = "org.bluez.AgentManager1";

@iface("org.bluez.Agent1")
export class BluetoothAgent extends Service {
  private isRegistered: boolean = false;

  constructor() {
    super();
  }

  // DBus methods using gnim decorators
  @method([], [])
  Release(): [] {
    console.log("[Bluetooth Agent] Release called");
    return [];
  }

  @method([], [])
  Cancel(): [] {
    console.log("[Bluetooth Agent] Cancel called");
    return [];
  }

  @method(["o", "u", "q"], [])
  DisplayPasskey(device: string, passkey: number, entered: number): [] {
    console.log(
      `[Bluetooth Agent] DisplayPasskey: ${device}, ${passkey}, ${entered}`,
    );
    return [];
  }

  @method(["o"], ["s"])
  RequestPinCode(device: string): [string] {
    console.log(`[Bluetooth Agent] RequestPinCode: ${device}`);
    throw new Error(
      "org.bluez.Error.Rejected: This agent only supports automatic pairing",
    );
  }

  @method(["o"], ["u"])
  RequestPasskey(device: string): [number] {
    console.log(`[Bluetooth Agent] RequestPasskey: ${device}`);
    throw new Error(
      "org.bluez.Error.Rejected: This agent only supports automatic pairing",
    );
  }

  @method(["o", "u"], [])
  RequestConfirmation(device: string, passkey: number): [] {
    console.log(`[Bluetooth Agent] RequestConfirmation: ${device}, ${passkey}`);
    throw new Error(
      "org.bluez.Error.Rejected: This agent only supports automatic pairing",
    );
  }

  @method(["o"], [])
  RequestAuthorization(device: string): [] {
    console.log(`[Bluetooth Agent] RequestAuthorization: ${device}`);
    throw new Error(
      "org.bluez.Error.Rejected: This agent only supports automatic pairing",
    );
  }

  @method(["o", "s"], [])
  AuthorizeService(device: string, uuid: string): [] {
    console.log(`[Bluetooth Agent] AuthorizeService: ${device}, ${uuid}`);
    throw new Error(
      "org.bluez.Error.Rejected: This agent only supports automatic pairing",
    );
  }

  // Register with BlueZ
  async register(): Promise<boolean> {
    if (this.isRegistered) return true;

    try {
      // Use gnim's serve method to export the service
      await this.serve({
        busType: Gio.BusType.SYSTEM,
        objectPath: AGENT_PATH,
      });

      await this.registerWithBlueZ();
      await this.setDefaultAgent();

      this.isRegistered = true;
      console.log("[Bluetooth Agent] Agent registered successfully");
      return true;
    } catch (error) {
      console.log(`[Bluetooth Agent] Error setting up agent: ${error}`);
      return false;
    }
  }

  /**
   * Generic helper method for making DBus calls to BlueZ AgentManager
   */
  private async callAgentManager(
    methodName: string,
    parameters: GLib.Variant,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const connection = Gio.DBus.system;
      connection.call(
        BLUEZ_SERVICE,
        "/org/bluez",
        AGENT_MANAGER_INTERFACE,
        methodName,
        parameters,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection, res) => {
          if (!connection) {
            reject(new Error("DBus connection is null"));
            return;
          }

          try {
            connection.call_finish(res);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      );
    });
  }

  private async registerWithBlueZ(): Promise<void> {
    return this.callAgentManager(
      "RegisterAgent",
      new GLib.Variant("(os)", [AGENT_PATH, CAPABILITY]),
    );
  }

  private async setDefaultAgent(): Promise<void> {
    return this.callAgentManager(
      "RequestDefaultAgent",
      new GLib.Variant("(o)", [AGENT_PATH]),
    );
  }

  async unregister(): Promise<boolean> {
    if (!this.isRegistered) return true;

    try {
      await this.unregisterFromBlueZ();
      this.isRegistered = false;
      return true;
    } catch (error) {
      console.log(`[Bluetooth Agent] Error unregistering agent: ${error}`);
      return false;
    }
  }

  private async unregisterFromBlueZ(): Promise<void> {
    return this.callAgentManager(
      "UnregisterAgent",
      new GLib.Variant("(o)", [AGENT_PATH]),
    );
  }
}

export async function startBluetoothAgent(): Promise<BluetoothAgent | null> {
  const agent = new BluetoothAgent();
  if (await agent.register()) return agent;
  return null;
}

// Enhanced agent management
export const ensureBluetoothAgent = async (): Promise<boolean> => {
  if (bluetoothAgent.get() === null) {
    console.log("Starting Bluetooth agent");
    const agent = await startBluetoothAgent();
    if (agent) {
      setBluetoothAgent(agent);
      setHasBluetoothAgent(true);
      return true;
    }
    return false;
  }
  return true;
};

export const stopBluetoothAgent = async (): Promise<boolean> => {
  const agent = bluetoothAgent.get();
  if (agent) {
    console.log("Stopping Bluetooth agent");
    if (await agent.unregister()) {
      console.log("Bluetooth agent stopped successfully");
      setBluetoothAgent(null);
      setHasBluetoothAgent(false);
      return true;
    } else {
      console.error("Failed to stop Bluetooth agent");
      return false;
    }
  }
  return true;
};
