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

function logMessage(message: string): void {
  console.log(`[Bluetooth Agent] ${message}`);
}

export class BluetoothAgent {
  private connection: Gio.DBusConnection;
  private registrationId: number = 0;
  private isRegistered: boolean = false;

  constructor() {
    this.connection = Gio.DBus.system;
  }

  // D-Bus method handler
  private handleMethodCall = (
    methodName: string,
    invocation: Gio.DBusMethodInvocation,
  ): void => {
    logMessage(`Handling method: ${methodName}`);

    try {
      switch (methodName) {
        case "Release":
        case "Cancel":
        case "DisplayPasskey":
          // These methods don't require any response beyond acknowledgment
          invocation.return_value(null);
          break;

        default:
          // With NoInputNoOutput capability, methods requiring user input
          // should never be called. If they are, reject them.
          logMessage(`Unexpected method call: ${methodName}`);
          invocation.return_error_literal(
            "org.bluez.Error.Rejected",
            "This agent only supports automatic pairing",
          );
      }
    } catch (error) {
      logMessage(`Error handling method ${methodName}: ${error}`);
      invocation.return_error_literal(
        "org.bluez.Error.Failed",
        `Error handling request: ${error}`,
      );
    }
  };

  // Register the agent on D-Bus
  register(): boolean {
    if (this.isRegistered) return true;

    try {
      // Define introspection XML for the agent interface
      const introspectionXml = `
        <node>
          <interface name="org.bluez.Agent1">
            <method name="Release" />
            <method name="DisplayPasskey">
              <arg name="device" type="o" direction="in" />
              <arg name="passkey" type="u" direction="in" />
              <arg name="entered" type="q" direction="in" />
            </method>
            <method name="Cancel" />
          </interface>
        </node>
      `;

      // Register the agent object
      const nodeInfo = Gio.DBusNodeInfo.new_for_xml(introspectionXml);
      this.registrationId = this.connection.register_object(
        AGENT_PATH,
        nodeInfo.interfaces[0],
        this.handleMethodCall,
        null,
        null,
      );

      if (this.registrationId === 0) {
        logMessage("Failed to register agent object");
        return false;
      }

      // Register with BlueZ
      this.connection.call(
        BLUEZ_SERVICE,
        "/org/bluez",
        AGENT_MANAGER_INTERFACE,
        "RegisterAgent",
        new GLib.Variant("(os)", [AGENT_PATH, CAPABILITY]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection, res) => {
          try {
            connection.call_finish(res);
            this.setDefaultAgent();
            logMessage("Agent registered successfully");
          } catch (error) {
            logMessage(`Error registering agent: ${error}`);
            this.isRegistered = false;
          }
        },
      );

      this.isRegistered = true;
      return true;
    } catch (error) {
      logMessage(`Error setting up agent: ${error}`);
      if (this.registrationId !== 0) {
        this.connection.unregister_object(this.registrationId);
        this.registrationId = 0;
      }
      return false;
    }
  }

  // Set as default agent
  private setDefaultAgent(): void {
    this.connection.call(
      BLUEZ_SERVICE,
      "/org/bluez",
      AGENT_MANAGER_INTERFACE,
      "RequestDefaultAgent",
      new GLib.Variant("(o)", [AGENT_PATH]),
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      null,
      (connection, res) => {
        try {
          connection.call_finish(res);
          logMessage("Agent set as default successfully");
        } catch (error) {
          logMessage(`Error setting agent as default: ${error}`);
        }
      },
    );
  }

  // Unregister the agent
  unregister(): boolean {
    if (!this.isRegistered) return true;

    try {
      // Unregister from BlueZ
      this.connection.call(
        BLUEZ_SERVICE,
        "/org/bluez",
        AGENT_MANAGER_INTERFACE,
        "UnregisterAgent",
        new GLib.Variant("(o)", [AGENT_PATH]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection, res) => {
          try {
            connection.call_finish(res);
            logMessage("Agent unregistered successfully");
          } catch (error) {
            logMessage(`Error unregistering agent: ${error}`);
          }
        },
      );

      // Unregister object
      if (this.registrationId !== 0) {
        this.connection.unregister_object(this.registrationId);
        this.registrationId = 0;
      }

      this.isRegistered = false;
      return true;
    } catch (error) {
      logMessage(`Error unregistering agent: ${error}`);
      return false;
    }
  }
}

export function startBluetoothAgent(): BluetoothAgent | null {
  const agent = new BluetoothAgent();
  if (agent.register()) return agent;
  return null;
}

// Enhanced agent management
export const ensureBluetoothAgent = (): boolean => {
  if (bluetoothAgent.get() === null) {
    console.log("Starting Bluetooth agent");
    const agent = startBluetoothAgent();
    if (agent) {
      setBluetoothAgent(agent);
      setHasBluetoothAgent(true);
      return true;
    }
    return false;
  }
  return true;
};

export const stopBluetoothAgent = (): boolean => {
  const agent = bluetoothAgent.get();
  if (agent) {
    console.log("Stopping Bluetooth agent");
    if (agent.unregister()) {
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
