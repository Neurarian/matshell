import { register, property } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio";
import {
  HardwareMonitor,
  ByteFormatter,
  safeDivide,
  safeReadFile,
} from "./base";
import { MonitorConfig } from ".";

export interface DiskInfo {
  mountPoint: string;
  utilization: number;
  used: string;
  total: string;
  usedBytes: number;
  totalBytes: number;
}

@register({ GTypeName: "DiskMonitor" })
export class DiskMonitor extends HardwareMonitor {
  private static readonly MOUNTS_PATH = "/proc/mounts";

  @property(Array) disks: DiskInfo[] = [];
  @property(Number) homeUtilization = 0;
  @property(Number) homeUsagePercent = 0;
  @property(String) homeUsed = "0 B";
  @property(String) homeTotal = "0 B";
  @property(Number) totalUtilization = 0;
  @property(Number) totalUtilizationPercent = 0;

  initialize(): void {
    this.startMonitoring(MonitorConfig.DISK_UPDATE_INTERVAL);
  }

  async update(): Promise<void> {
    await this.updateDiskSpace();
  }

  private async updateDiskSpace(): Promise<void> {
    try {
      const disks = await this.collectDiskInfo();
      this.disks = disks;

      this.updateTotalUtilization(disks);
      this.updateHomeUtilization(disks);
    } catch (error) {
      console.error("Disk space update failed:", error);
    }
  }

  private async collectDiskInfo(): Promise<DiskInfo[]> {
    const mounts = await safeReadFile(DiskMonitor.MOUNTS_PATH);
    if (!mounts) return [];

    const disks: DiskInfo[] = [];
    const seenDevices = new Set<string>();

    const mountLines = mounts
      .split("\n")
      .filter((line) => this.isPhysicalDevice(line));

    for (const line of mountLines) {
      const parts = line.split(" ");
      if (parts.length < 2) continue;

      const device = parts[0];
      const mountPoint = parts[1];

      if (seenDevices.has(device)) continue;

      const diskInfo = await this.getDiskInfo(mountPoint);
      if (diskInfo && diskInfo.totalBytes > 0) {
        seenDevices.add(device);
        disks.push(diskInfo);
      }
    }

    return disks;
  }

  private isPhysicalDevice(line: string): boolean {
    return (
      line.startsWith("/dev/") &&
      !line.includes("loop") &&
      !line.includes("tmpfs")
    );
  }

  private async getDiskInfo(mountPoint: string): Promise<DiskInfo | null> {
    try {
      const file = Gio.File.new_for_path(mountPoint);
      const info = file.query_filesystem_info("filesystem::*", null);

      const total = info.get_attribute_uint64("filesystem::size");
      const free = info.get_attribute_uint64("filesystem::free");
      const used = total - free;

      return {
        mountPoint,
        utilization: safeDivide(used, total),
        used: ByteFormatter.format(used),
        total: ByteFormatter.format(total),
        usedBytes: used,
        totalBytes: total,
      };
    } catch (error) {
      console.error(`Failed to get disk info for ${mountPoint}:`, error);
      return null;
    }
  }

  private updateTotalUtilization(disks: DiskInfo[]): void {
    if (disks.length === 0) {
      this.totalUtilization = 0;
      this.totalUtilizationPercent = 0;
      return;
    }

    const totalUsed = disks.reduce((sum, d) => sum + d.usedBytes, 0);
    const totalSize = disks.reduce((sum, d) => sum + d.totalBytes, 0);

    this.totalUtilization = safeDivide(totalUsed, totalSize);
    this.totalUtilizationPercent = Math.round(this.totalUtilization * 100);
  }

  private updateHomeUtilization(disks: DiskInfo[]): void {
    const homeDir = GLib.get_home_dir();
    const homeDisk = disks
      .filter((d) => homeDir.startsWith(d.mountPoint))
      .sort((a, b) => b.mountPoint.length - a.mountPoint.length)[0];

    if (homeDisk) {
      this.homeUtilization = homeDisk.utilization;
      this.homeUsed = homeDisk.used;
      this.homeTotal = homeDisk.total;
      this.homeUsagePercent = Math.round(this.homeUtilization * 100);
    } else {
      this.homeUtilization = 0;
      this.homeUsed = "0 B";
      this.homeTotal = "0 B";
      this.homeUsagePercent = 0;
    }
  }
}
