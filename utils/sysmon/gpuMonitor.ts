import { register, property } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio";
import { exec, execAsync } from "ags/process";
import {
  HardwareMonitor,
  ByteFormatter,
  safeDivide,
  safeReadFile,
} from "./base";
import { MonitorConfig } from ".";

@register()
export class BaseGpuMonitor extends HardwareMonitor {
  @property(Boolean) detected = false;
  @property(Number) utilization = 0;
  @property(Number) utilizationPercent = 0;
  @property(Number) memoryUsed = 0;
  @property(Number) memoryTotal = 0;
  @property(Number) memoryUtilizationPercent = 0;
  @property(Number) temperature = 0;
  @property(String) memoryUsedFormatted = "0 B";
  @property(String) memoryTotalFormatted = "0 B";

  initialize(): void {
    this.startMonitoring(MonitorConfig.UPDATE_INTERVAL);
  }

  async update(): Promise<void> {}

  protected updateDerivedProperties(): void {
    this.utilizationPercent = Math.round(this.utilization * 100);
    this.memoryUsedFormatted = ByteFormatter.format(this.memoryUsed);
    this.memoryTotalFormatted = ByteFormatter.format(this.memoryTotal);
    this.memoryUtilizationPercent = Math.round(
      safeDivide(this.memoryUsed, this.memoryTotal) * 100,
    );
  }
}

function parseNvidiaSmiOutput(output: string): {
  util: number;
  memUsed: number;
  memTotal: number;
  temp: number;
} | null {
  const values = output
    .trim()
    .split(",")
    .map((v) => v.trim());

  if (values.length < 4) {
    return null;
  }

  const [util, memUsed, memTotal, temp] = values.map(Number);

  if (isNaN(util) || isNaN(memUsed) || isNaN(memTotal) || isNaN(temp)) {
    return null;
  }

  return { util, memUsed, memTotal, temp };
}

@register({ GTypeName: "NvidiaGpuMonitor" })
export class NvidiaGpuMonitor extends BaseGpuMonitor {
  async update(): Promise<void> {
    try {
      const output = await execAsync(
        "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits",
      );

      const parsed = parseNvidiaSmiOutput(output);
      if (!parsed) {
        throw new Error("Invalid nvidia-smi output");
      }

      this.utilization = parsed.util / 100;
      this.memoryUsed = parsed.memUsed * 1024 * 1024;
      this.memoryTotal = parsed.memTotal * 1024 * 1024;
      this.temperature = parsed.temp;

      this.updateDerivedProperties();
    } catch (error) {
      console.error("Nvidia GPU monitoring encountered runtime error:", error);
    }
  }
}

@register({ GTypeName: "AmdGpuMonitor" })
export class AmdGpuMonitor extends BaseGpuMonitor {
  private gpuBusyPath: string;
  private gpuMemUsedPath: string | null = null;
  private gpuMemTotalPath: string | null = null;
  private gpuTempPath: string | null = null;

  constructor(
    busyPath: string,
    memUsedPath?: string,
    memTotalPath?: string,
    tempPath?: string,
  ) {
    super();
    this.gpuBusyPath = busyPath;
    this.gpuMemUsedPath = memUsedPath ?? null;
    this.gpuMemTotalPath = memTotalPath ?? null;
    this.gpuTempPath = tempPath ?? null;
  }

  async update(): Promise<void> {
    try {
      await Promise.all([
        this.updateUtilization(),
        this.updateMemory(),
        this.updateTemperature(),
      ]);

      this.updateDerivedProperties();
    } catch (error) {
      console.error("AMD GPU monitoring failed:", error);
    }
  }

  private async updateUtilization(): Promise<void> {
    const gpuBusy = await safeReadFile(this.gpuBusyPath);
    if (gpuBusy !== null) {
      const parsed = parseInt(gpuBusy.trim());
      if (!isNaN(parsed)) {
        this.utilization = parsed / 100;
      }
    }
  }

  private async updateMemory(): Promise<void> {
    if (!this.gpuMemUsedPath || !this.gpuMemTotalPath) return;

    const [memUsed, memTotal] = await Promise.all([
      safeReadFile(this.gpuMemUsedPath),
      safeReadFile(this.gpuMemTotalPath),
    ]);

    if (memUsed !== null && memTotal !== null) {
      const usedParsed = parseInt(memUsed.trim());
      const totalParsed = parseInt(memTotal.trim());

      if (!isNaN(usedParsed) && !isNaN(totalParsed)) {
        this.memoryUsed = usedParsed;
        this.memoryTotal = totalParsed;
      }
    }
  }

  private async updateTemperature(): Promise<void> {
    if (!this.gpuTempPath) return;

    const temp = await safeReadFile(this.gpuTempPath);
    if (temp !== null) {
      const parsed = parseInt(temp.trim());
      if (!isNaN(parsed)) {
        this.temperature = parsed / 1000;
      }
    }
  }
}

export class GpuMonitorFactory {
  static create(): BaseGpuMonitor {
    let monitor: BaseGpuMonitor;

    const amdMonitor = this.tryCreateAmdMonitor();
    if (amdMonitor) {
      monitor = amdMonitor;
      monitor.detected = true;
    } else if (this.hasNvidiaGpu()) {
      console.log("Monitoring Nvidia GPU (nvidia-smi)");
      monitor = new NvidiaGpuMonitor();
      monitor.detected = true;
    } else {
      console.warn("No supported GPU detected");
      monitor = new BaseGpuMonitor();
      monitor.detected = false;
    }

    monitor.initialize();
    return monitor;
  }

  private static hasNvidiaGpu(): boolean {
    if (GLib.find_program_in_path("nvidia-smi") === null) {
      return false;
    }

    try {
      const output = exec(
        "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits",
      );

      const parsed = parseNvidiaSmiOutput(output);
      if (!parsed) {
        console.log("nvidia-smi returned invalid output");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to validate nvidia-smi:", error);
      return false;
    }
  }

  private static tryCreateAmdMonitor(): AmdGpuMonitor | null {
    const drmPath = "/sys/class/drm";

    if (!GLib.file_test(drmPath, GLib.FileTest.IS_DIR)) {
      return null;
    }

    try {
      const drmDir = Gio.File.new_for_path(drmPath);
      const enumerator = drmDir.enumerate_children(
        "standard::name",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const name = info.get_name();
        if (!/^card\d+$/.test(name)) continue;

        const devicePath = `${drmPath}/${name}/device`;
        const busyPath = `${devicePath}/gpu_busy_percent`;

        if (!GLib.file_test(busyPath, GLib.FileTest.EXISTS)) continue;

        const memUsedPath = `${devicePath}/mem_info_vram_used`;
        const memTotalPath = `${devicePath}/mem_info_vram_total`;
        const hasMemoryInfo =
          GLib.file_test(memUsedPath, GLib.FileTest.EXISTS) &&
          GLib.file_test(memTotalPath, GLib.FileTest.EXISTS);

        const tempPath = this.findAmdTempPath(devicePath);

        console.log(`Monitoring AMD GPU: ${name}`);
        return new AmdGpuMonitor(
          busyPath,
          hasMemoryInfo ? memUsedPath : undefined,
          hasMemoryInfo ? memTotalPath : undefined,
          tempPath ?? undefined,
        );
      }
    } catch (error) {
      console.error("AMD GPU detection failed:", error);
    }

    return null;
  }

  private static findAmdTempPath(devicePath: string): string | null {
    const hwmonPath = `${devicePath}/hwmon`;

    if (!GLib.file_test(hwmonPath, GLib.FileTest.IS_DIR)) {
      return null;
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
        if (hwmonName.startsWith("hwmon")) {
          const tempPath = `${hwmonPath}/${hwmonName}/temp1_input`;
          if (GLib.file_test(tempPath, GLib.FileTest.EXISTS)) {
            return tempPath;
          }
        }
      }
    } catch (error) {
      console.error("AMD temp sensor detection failed:", error);
    }

    return null;
  }
}
