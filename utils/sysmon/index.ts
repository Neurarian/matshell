import GObject, { register, signal } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import { MonitorConfig } from "./base";
import { CpuMonitor } from "./cpuMonitor";
import { MemoryMonitor } from "./memoryMonitor";
import { NetworkMonitor } from "./networkMonitor";
import { GpuMonitorFactory } from "./gpuMonitor";
import { DiskMonitor } from "./diskMonitor";
import { SystemInfoMonitor } from "./systemInfoMonitor";

export { DiskInfo } from "./diskMonitor";
export { ByteFormatter } from "./base";

interface SystemMonitorSignals extends GObject.Object.SignalSignatures {
  "high-cpu-usage": SystemMonitor["highCpuUsage"];
  "high-memory-usage": SystemMonitor["highMemoryUsage"];
}

@register({ GTypeName: "SystemMonitor" })
export default class SystemMonitor extends GObject.Object {
  declare $signals: SystemMonitorSignals;

  static instance: SystemMonitor;

  public readonly cpu: CpuMonitor = new CpuMonitor();
  public readonly memory: MemoryMonitor = new MemoryMonitor();
  public readonly network: NetworkMonitor = new NetworkMonitor();
  public readonly disk: DiskMonitor = new DiskMonitor();
  public readonly system: SystemInfoMonitor = new SystemInfoMonitor();
  public readonly gpu = GpuMonitorFactory.create();

  private thresholdStates = {
    highCpu: false,
    highMemory: false,
    lastCpuAlert: 0,
    lastMemoryAlert: 0,
  };

  @signal([Number], GObject.TYPE_NONE, { default: false })
  highCpuUsage(load: number): undefined {}

  @signal([Number], GObject.TYPE_NONE, { default: false })
  highMemoryUsage(utilization: number): undefined {}

  static get_default(): SystemMonitor {
    return this.instance || (this.instance = new SystemMonitor());
  }

  constructor() {
    super();
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    console.log("SystemMonitor: Starting initialization...");

    await Promise.all([
      this.cpu.initialize(),
      this.memory.initialize(),
      this.network.initialize(),
      this.disk.initialize(),
      this.system.initialize(),
    ]);

    this.startThresholdMonitoring();

    console.log("SystemMonitor: Initialization complete");
  }

  private startThresholdMonitoring(): void {
    GLib.timeout_add(GLib.PRIORITY_LOW, MonitorConfig.UPDATE_INTERVAL, () => {
      this.checkThresholds();
      return GLib.SOURCE_CONTINUE;
    });
  }

  // TODO: At least cpu is kinda useless I guess.
  // rather track and warn about temps instead.
  private checkThresholds(): void {
    const now = Date.now();

    const highCpu = this.cpu.load > MonitorConfig.HIGH_CPU_THRESHOLD;
    if (highCpu && !this.thresholdStates.highCpu) {
      if (
        now - this.thresholdStates.lastCpuAlert >
        MonitorConfig.THRESHOLD_DEBOUNCE_MS
      ) {
        this.emit("high-cpu-usage", this.cpu.load);
        this.thresholdStates.lastCpuAlert = now;
      }
    }
    this.thresholdStates.highCpu = highCpu;

    const highMemory =
      this.memory.utilization > MonitorConfig.HIGH_MEMORY_THRESHOLD;
    if (highMemory && !this.thresholdStates.highMemory) {
      if (
        now - this.thresholdStates.lastMemoryAlert >
        MonitorConfig.THRESHOLD_DEBOUNCE_MS
      ) {
        this.emit("high-memory-usage", this.memory.utilization);
        this.thresholdStates.lastMemoryAlert = now;
      }
    }
    this.thresholdStates.highMemory = highMemory;
  }

  destroy(): void {
    this.cpu.destroy();
    this.memory.destroy();
    this.network.destroy();
    this.gpu.destroy();
    this.disk.destroy();
    this.system.destroy();
  }
}
