import { register, property } from "ags/gobject";
import GTop from "gi://GTop";
import Gio from "gi://Gio";
import GLib from "gi://GLib?version=2.0";
import {
  HardwareMonitor,
  MonitorConfig,
  ByteFormatter,
  safeReadFile,
} from "./base";

@register({ GTypeName: "NetworkMonitor" })
export class NetworkMonitor extends HardwareMonitor {
  private netload = new GTop.glibtop_netload();
  private networkInterface = "";
  private lastNetBytesIn = 0;
  private lastNetBytesOut = 0;
  private redetectionIntervalId: number | null = null;

  @property(Number) downloadSpeed = 0;
  @property(Number) uploadSpeed = 0;
  @property(String) interface = "";
  @property(String) downloadFormatted = "0 B/s";
  @property(String) uploadFormatted = "0 B/s";

  async initialize(): Promise<void> {
    await this.detectNetworkInterface();
    this.startMonitoring(MonitorConfig.UPDATE_INTERVAL);
    this.startInterfaceRedetection();
  }

  async update(): Promise<void> {
    if (!this.networkInterface) return;

    try {
      GTop.glibtop_get_netload(this.netload, this.networkInterface);

      const currentBytesIn = this.netload.bytes_in;
      const currentBytesOut = this.netload.bytes_out;

      const intervalSec = MonitorConfig.UPDATE_INTERVAL / 1000;
      this.downloadSpeed = (currentBytesIn - this.lastNetBytesIn) / intervalSec;
      this.uploadSpeed = (currentBytesOut - this.lastNetBytesOut) / intervalSec;

      this.downloadFormatted = `${ByteFormatter.format(this.downloadSpeed)}/s`;
      this.uploadFormatted = `${ByteFormatter.format(this.uploadSpeed)}/s`;

      this.lastNetBytesIn = currentBytesIn;
      this.lastNetBytesOut = currentBytesOut;
    } catch (error) {
      console.error("Network metrics update failed:", error);
      this.resetMetrics();
    }
  }

  private async detectNetworkInterface(): Promise<void> {
    const netDir = "/sys/class/net";

    if (!GLib.file_test(netDir, GLib.FileTest.IS_DIR)) {
      console.warn("Network directory not found");
      return;
    }

    try {
      const netDirFile = Gio.File.new_for_path(netDir);
      const enumerator = netDirFile.enumerate_children(
        "standard::name",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const name = info.get_name();

        if (this.isVirtualInterface(name)) continue;

        const operstate = await safeReadFile(
          `/sys/class/net/${name}/operstate`,
        );
        if (operstate?.trim() === "up") {
          this.networkInterface = name;
          this.interface = name;
          return;
        }
      }
    } catch (error) {
      console.warn("Network interface detection failed:", error);
    }
  }

  private isVirtualInterface(name: string): boolean {
    return (
      name === "lo" ||
      name.startsWith("vir") ||
      name.startsWith("docker") ||
      name.startsWith("veth") ||
      name.startsWith("br-")
    );
  }

  // Covers interface change
  private startInterfaceRedetection(): void {
    this.redetectionIntervalId = GLib.timeout_add(
      GLib.PRIORITY_LOW,
      30000,
      () => {
        if (this.destroyed) return GLib.SOURCE_REMOVE;

        this.detectNetworkInterface().catch((error) => {
          console.error("Interface redetection failed:", error);
        });

        return GLib.SOURCE_CONTINUE;
      },
    );
  }

  private resetMetrics(): void {
    this.downloadSpeed = 0;
    this.uploadSpeed = 0;
    this.downloadFormatted = "0 B/s";
    this.uploadFormatted = "0 B/s";
  }

  destroy(): void {
    super.destroy();
    if (this.redetectionIntervalId !== null) {
      GLib.source_remove(this.redetectionIntervalId);
      this.redetectionIntervalId = null;
    }
  }
}
