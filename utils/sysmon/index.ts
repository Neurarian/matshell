import GObject, { register, signal } from "ags/gobject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib?version=2.0";
import { CpuMonitor } from "./cpuMonitor";
import { MemoryMonitor } from "./memoryMonitor";
import { NetworkMonitor } from "./networkMonitor";
import { GpuMonitorFactory } from "./gpuMonitor";
import { DiskMonitor } from "./diskMonitor";
import { SystemInfoMonitor } from "./systemInfoMonitor";
import options from "options";

export { DiskInfo } from "./diskMonitor";
export { ByteFormatter } from "./base";

// Config
export const MonitorConfig = {
  UPDATE_INTERVAL: 1000,
  DISK_UPDATE_INTERVAL: 5000,
  THRESHOLD_DEBOUNCE_MS: 3000,
  settings: {
    criticalCpuTemp: options["hardware-monitor.thresholds.cpu-temp"],
    criticalGpuTemp: options["hardware-monitor.thresholds.gpu-temp"],
    highMemoryThreshold: options["hardware-monitor.thresholds.memory"],
    notificationsEnabled: options["hardware-monitor.notifications.enable"],
  },
};

@register({ GTypeName: "SystemMonitor" })
export default class SystemMonitor extends GObject.Object {
  static instance: SystemMonitor;

  public readonly cpu: CpuMonitor = new CpuMonitor();
  public readonly memory: MemoryMonitor = new MemoryMonitor();
  public readonly network: NetworkMonitor = new NetworkMonitor();
  public readonly disk: DiskMonitor = new DiskMonitor();
  public readonly system: SystemInfoMonitor = new SystemInfoMonitor();
  public readonly gpu = GpuMonitorFactory.create();

  private thresholdStates = {
    highCpuTemp: false,
    highGpuTemp: false,
    highMemory: false,
    lastCpuTempAlert: 0,
    lastGpuTempAlert: 0,
    lastMemoryAlert: 0,
  };

  private notificationIds = {
    cpuTemp: 9001,
    gpuTemp: 9002,
    mem: 9003,
  };

  private unsubscribers: (() => void)[] = [];

  @signal([Number], GObject.TYPE_NONE, { default: false })
  highCpuTemp(temp: number): undefined {}

  @signal([Number], GObject.TYPE_NONE, { default: false })
  highGpuTemp(temp: number): undefined {}

  @signal([Number], GObject.TYPE_NONE, { default: false })
  highMemoryUsage(utilization: number): undefined {}

  static get_default(): SystemMonitor {
    return this.instance || (this.instance = new SystemMonitor());
  }

  constructor() {
    super();
    this.setupWatchers();
    this.initializeAsync();
  }

  private setupWatchers(): void {
    const notificationUnsubscribe =
      MonitorConfig.settings.notificationsEnabled.subscribe(() => {
        const enabled = MonitorConfig.settings.notificationsEnabled.get();
        console.log(
          `Hardware monitoring notifications ${enabled ? "enabled" : "disabled"}`,
        );
      });

    const cpuThresholdUnsubscribe =
      MonitorConfig.settings.criticalCpuTemp.subscribe(() => {
        const temp = MonitorConfig.settings.criticalCpuTemp.get();
        console.log(`CPU temperature threshold updated to ${temp}°C`);
      });

    const gpuThresholdUnsubscribe =
      MonitorConfig.settings.criticalGpuTemp.subscribe(() => {
        const temp = MonitorConfig.settings.criticalGpuTemp.get();
        console.log(`GPU temperature threshold updated to ${temp}°C`);
      });

    const memoryThresholdUnsubscribe =
      MonitorConfig.settings.highMemoryThreshold.subscribe(() => {
        const mem = MonitorConfig.settings.highMemoryThreshold.get();
        console.log(`Memory threshold updated to ${mem} (0-1)`);
      });

    this.unsubscribers.push(
      notificationUnsubscribe,
      cpuThresholdUnsubscribe,
      gpuThresholdUnsubscribe,
      memoryThresholdUnsubscribe,
    );
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

  private async sendHardwareNotification(
    type: "temperature" | "memory",
    component: string,
    value: number,
    replaceId: number,
  ): Promise<void> {
    if (!MonitorConfig.settings.notificationsEnabled.get()) {
      return;
    }

    let title: string;
    let body: string;
    let icon: string;

    if (type === "temperature") {
      title = `${component} Overheating!`;
      body = `Current temperature: ${Math.round(value)}°C`;
      icon = "dialog-warning";
    } else {
      title = `${component} Usage Critical!`;
      body = `Current usage: ${Math.round(value * 100)}%`;
      icon = "dialog-warning";
    }

    await execAsync(
      `notify-send -u critical -i "${icon}" --replace-id=${replaceId} "${title}" "${body}"`,
    );
  }
  private checkThresholds(): void {
    const now = Date.now();

    const cpuThreshold = MonitorConfig.settings.criticalCpuTemp.get();
    const gpuThreshold = MonitorConfig.settings.criticalGpuTemp.get();
    const memoryThreshold = MonitorConfig.settings.highMemoryThreshold.get();
    const debounceMs = MonitorConfig.THRESHOLD_DEBOUNCE_MS;

    const highCpuTemp = this.cpu.temperature > cpuThreshold;
    if (highCpuTemp && !this.thresholdStates.highCpuTemp) {
      if (now - this.thresholdStates.lastCpuTempAlert > debounceMs) {
        this.emit("high-cpu-temp", this.cpu.temperature);
        this.sendHardwareNotification(
          "temperature",
          "CPU",
          this.cpu.temperature,
          this.notificationIds.cpuTemp,
        );
        this.thresholdStates.lastCpuTempAlert = now;
      }
    }
    this.thresholdStates.highCpuTemp = highCpuTemp;

    const highGpuTemp = this.gpu.temperature > gpuThreshold;
    if (highGpuTemp && !this.thresholdStates.highGpuTemp) {
      if (now - this.thresholdStates.lastGpuTempAlert > debounceMs) {
        this.emit("high-gpu-temp", this.gpu.temperature);
        this.sendHardwareNotification(
          "temperature",
          "GPU",
          this.gpu.temperature,
          this.notificationIds.gpuTemp,
        );
        this.thresholdStates.lastGpuTempAlert = now;
      }
    }
    this.thresholdStates.highGpuTemp = highGpuTemp;

    const highMemory = this.memory.utilization > memoryThreshold;
    if (highMemory && !this.thresholdStates.highMemory) {
      if (now - this.thresholdStates.lastMemoryAlert > debounceMs) {
        this.emit("high-memory-usage", this.memory.utilization);
        this.sendHardwareNotification(
          "memory",
          "Memory",
          this.memory.utilization,
          this.notificationIds.mem,
        );
        this.thresholdStates.lastMemoryAlert = now;
      }
    }
    this.thresholdStates.highMemory = highMemory;
  }

  destroy(): void {
    this.unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error during unsubscribe:", error);
      }
    });
    this.unsubscribers = [];

    this.cpu.destroy();
    this.memory.destroy();
    this.network.destroy();
    this.gpu.destroy();
    this.disk.destroy();
    this.system.destroy();
  }
}
