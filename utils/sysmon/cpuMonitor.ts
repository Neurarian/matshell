import { register, property } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import GTop from "gi://GTop";
import Gio from "gi://Gio";
import { HardwareMonitor, MonitorConfig, safeReadFile } from "./base";

@register({ GTypeName: "CpuMonitor" })
export class CpuMonitor extends HardwareMonitor {
  private static readonly CPU_INFO_PATH = "/proc/cpuinfo";

  private cpu = new GTop.glibtop_cpu();
  private lastCpuUsed = 0;
  private lastCpuTotal = 0;
  private cpuTempPath: string | null = null;

  @property(Number) load = 0;
  @property(Number) frequency = 0;
  @property(Number) temperature = 0;
  @property(Number) usagePercent = 0;

  async initialize(): Promise<void> {
    await this.detectTemperatureSensor();
    this.startMonitoring(MonitorConfig.UPDATE_INTERVAL);
  }

  async update(): Promise<void> {
    await Promise.all([
      this.updateCpuUsage(),
      this.updateFrequency(),
      this.updateTemperature(),
    ]);
  }

  private async updateCpuUsage(): Promise<void> {
    GTop.glibtop_get_cpu(this.cpu);

    const currentUsed = this.calculateCpuUsed(this.cpu);
    const currentTotal = this.calculateCpuTotal(this.cpu);
    const diffUsed = currentUsed - this.lastCpuUsed;
    const diffTotal = currentTotal - this.lastCpuTotal;

    this.load =
      diffTotal > 0 ? Math.min(1, Math.max(0, diffUsed / diffTotal)) : 0;
    this.usagePercent = Math.round(this.load * 100);

    this.lastCpuUsed = currentUsed;
    this.lastCpuTotal = currentTotal;
  }

  private async updateFrequency(): Promise<void> {
    try {
      const frequencies = await this.parseCpuFrequencies();
      if (frequencies.length > 0) {
        this.frequency = Math.round(
          frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
        );
      }
    } catch (error) {
      console.error("CPU frequency update failed:", error);
    }
  }

  private async updateTemperature(): Promise<void> {
    if (!this.cpuTempPath) return;

    const temp = await safeReadFile(this.cpuTempPath);
    if (temp !== null) {
      const parsed = parseInt(temp.trim());
      if (!isNaN(parsed)) {
        this.temperature = parsed / 1000;
      }
    }
  }

  private async detectTemperatureSensor(): Promise<void> {
    const hwmonPath = "/sys/class/hwmon";

    if (!GLib.file_test(hwmonPath, GLib.FileTest.IS_DIR)) {
      console.warn("hwmon directory not found");
      return;
    }

    try {
      const hwmonDir = Gio.File.new_for_path(hwmonPath);
      const enumerator = hwmonDir.enumerate_children(
        "standard::name",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const hwmonName = info.get_name();
        const hwmonSubPath = `${hwmonPath}/${hwmonName}`;
        const namePath = `${hwmonSubPath}/name`;

        const sensorName = await safeReadFile(namePath);
        if (!sensorName) continue;

        const name = sensorName.trim().toLowerCase();
        if (
          name.includes("coretemp") ||
          name.includes("k10temp") ||
          name.includes("zenpower")
        ) {
          const tempPath = `${hwmonSubPath}/temp1_input`;
          if (GLib.file_test(tempPath, GLib.FileTest.EXISTS)) {
            this.cpuTempPath = tempPath;
            console.log(`Monitoring CPU temp sensor: ${name}`);
            return;
          }
        }
      }

      console.warn("No CPU temperature sensor found");
    } catch (error) {
      console.error("CPU temperature sensor detection failed:", error);
    }
  }

  private async parseCpuFrequencies(): Promise<number[]> {
    const content = await safeReadFile(CpuMonitor.CPU_INFO_PATH);
    if (!content) return [];

    return content
      .split("\n")
      .filter((line) => line.includes("cpu MHz"))
      .map((line) => {
        const parts = line.split(":");
        if (parts.length < 2) return NaN;

        const value = parts[1].trim();
        const parsed = parseFloat(value);
        return isNaN(parsed) ? NaN : parsed;
      })
      .filter((freq) => !isNaN(freq));
  }

  private calculateCpuUsed(cpu: GTop.glibtop_cpu): number {
    return cpu.user + cpu.sys + cpu.nice + cpu.irq + cpu.softirq;
  }

  private calculateCpuTotal(cpu: GTop.glibtop_cpu): number {
    return this.calculateCpuUsed(cpu) + cpu.idle + cpu.iowait;
  }
}
