import GObject, { register, property, getter, signal } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio";
import GTop from "gi://GTop";
import { readFileAsync } from "ags/file";
import { execAsync } from "ags/process";

interface DiskInfo {
  mountPoint: string;
  utilization: number;
  used: string;
  total: string;
  usedBytes: number;
  totalBytes: number;
}

interface SystemMonitorSignals extends GObject.Object.SignalSignatures {
  "high-cpu-usage": SystemMonitor["highCpuUsage"];
  "high-memory-usage": SystemMonitor["highMemoryUsage"];
}

@register({ GTypeName: "SystemMonitor" })
export default class SystemMonitor extends GObject.Object {
  declare $signals: SystemMonitorSignals;
  static instance: SystemMonitor;

  // Config
  private static readonly CPU_INFO_PATH = "/proc/cpuinfo";
  private static readonly UPDATE_INTERVAL = 1000;
  private static readonly HIGH_CPU_THRESHOLD = 0.8;
  private static readonly HIGH_MEMORY_THRESHOLD = 0.85;

  // GTop
  #memory = new GTop.glibtop_mem();
  #swap = new GTop.glibtop_swap();
  #loadavg = new GTop.glibtop_loadavg();
  #uptime = new GTop.glibtop_uptime();
  #cpu = new GTop.glibtop_cpu();
  #netload = new GTop.glibtop_netload();

  // Tracking
  #lastCpuUsed = 0;
  #lastCpuTotal = 0;
  #cpuTempPath: string | null = null;
  #lastNetBytesIn = 0;
  #lastNetBytesOut = 0;
  #networkInterface = "";
  #gpuType: "nvidia" | "amd" | null = null;
  #gpuBusyPath: string | null = null;
  #gpuMemUsedPath: string | null = null;
  #gpuMemTotalPath: string | null = null;
  #gpuTempPath: string | null = null;

  // CPU & Memory
  @property(Number) cpuLoad = 0;
  @property(Number) cpuFrequency = 0;
  @property(Number) cpuTemperature = 0;
  @property(Number) memoryUtilization = 0;
  @property(String) memoryUsed = "0 B";
  @property(String) memoryTotal = "0 B";
  @property(Number) swapUtilization = 0;
  @property(String) swapUsed = "0 B";
  @property(String) swapTotal = "0 B";

  // System
  @property(Number) loadAverage1 = 0;
  @property(Number) loadAverage5 = 0;
  @property(Number) loadAverage15 = 0;
  @property(Number) uptime = 0;
  @property(Number) processCount = 0;

  // Network
  @property(Number) networkDownloadSpeed = 0;
  @property(Number) networkUploadSpeed = 0;
  @property(String) networkInterface = "";

  // GPU
  @property(Number) gpuUtilization = 0;
  @property(Number) gpuMemoryUsed = 0;
  @property(Number) gpuMemoryTotal = 0;
  @property(Number) gpuTemperature = 0;

  // Disk
  @property(Object) disks: DiskInfo[] = [];
  @property(Number) diskUtilization = 0;
  @property(String) diskUsed = "0 B";
  @property(String) diskTotal = "0 B";

  // Signals
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
    await this.detectNetworkInterface();
    await this.detectGPU();
    await this.detectCpuTemperatureSensor();
    this.initializeStaticMetrics();
    this.startMonitoring();
  }

  private initializeStaticMetrics(): void {
    GTop.glibtop_get_mem(this.#memory);
    this.memoryTotal = this.formatBytes(this.#memory.total);

    GTop.glibtop_get_swap(this.#swap);
    this.swapTotal = this.formatBytes(this.#swap.total);

    // Slow change, so init
    this.updateDiskSpace();
  }

  private async detectNetworkInterface(): Promise<void> {
    try {
      const netDir = Gio.File.new_for_path("/sys/class/net");
      const enumerator = netDir.enumerate_children(
        "standard::name",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const name = info.get_name();

        // Skip loopback and virtual interfaces
        if (
          name === "lo" ||
          name.startsWith("vir") ||
          name.startsWith("docker") ||
          name.startsWith("veth")
        ) {
          continue;
        }

        try {
          // Check if interface is up
          const operstate = await readFileAsync(
            `/sys/class/net/${name}/operstate`,
          );

          if (operstate.trim() === "up") {
            this.#networkInterface = name;
            this.networkInterface = name;
            console.log(`Monitoring network interface: ${name}`);
            return;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.warn("Network interface detection failed:", error);
    }
  }

  private async detectGPU(): Promise<void> {
    // Try Nvidia first
    try {
      await execAsync("nvidia-smi -L");
      this.#gpuType = "nvidia";
      console.log("Monitoring Nvidia GPU (nvidia-smi)");
      return;
    } catch {}

    // Try AMD
    try {
      const drmDir = Gio.File.new_for_path("/sys/class/drm");
      const enumerator = drmDir.enumerate_children(
        "standard::name",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const name = info.get_name();
        if (/^card\d+$/.test(name)) {
          const devicePath = `/sys/class/drm/${name}/device`;
          const busyPath = `${devicePath}/gpu_busy_percent`;

          if (GLib.file_test(busyPath, GLib.FileTest.EXISTS)) {
            this.#gpuType = "amd";
            this.#gpuBusyPath = busyPath;

            // Memory paths
            const memUsedPath = `${devicePath}/mem_info_vram_used`;
            const memTotalPath = `${devicePath}/mem_info_vram_total`;
            if (GLib.file_test(memUsedPath, GLib.FileTest.EXISTS)) {
              this.#gpuMemUsedPath = memUsedPath;
              this.#gpuMemTotalPath = memTotalPath;
            }

            // Temp path
            const hwmonPath = `${devicePath}/hwmon`;
            if (GLib.file_test(hwmonPath, GLib.FileTest.IS_DIR)) {
              const hwmonDir = Gio.File.new_for_path(hwmonPath);
              const hwmonEnum = hwmonDir.enumerate_children(
                "standard::name",
                Gio.FileQueryInfoFlags.NONE,
                null,
              );

              for (const hwmonInfo of hwmonEnum) {
                const hwmonName = hwmonInfo.get_name();
                if (hwmonName.startsWith("hwmon")) {
                  const tempPath = `${hwmonPath}/${hwmonName}/temp1_input`;
                  if (GLib.file_test(tempPath, GLib.FileTest.EXISTS)) {
                    this.#gpuTempPath = tempPath;
                    break;
                  }
                }
              }
            }
            console.log(`Monitoring AMD GPU: ${name}`);
            return;
          }
        }
      }
    } catch (error) {
      console.error("GPU detection failed:", error);
      return;
    }

    console.warn("No supported GPU detected");
  }

  private async detectCpuTemperatureSensor(): Promise<void> {
    try {
      const hwmonPath = "/sys/class/hwmon";
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

        if (GLib.file_test(namePath, GLib.FileTest.EXISTS)) {
          try {
            const _sensorName = await readFileAsync(namePath);
            const sensorName = _sensorName.trim().toLowerCase();

            if (
              sensorName.includes("coretemp") ||
              sensorName.includes("k10temp") ||
              sensorName.includes("zenpower")
            ) {
              const tempPath = `${hwmonSubPath}/temp1_input`;
              if (GLib.file_test(tempPath, GLib.FileTest.EXISTS)) {
                this.#cpuTempPath = tempPath;
                console.log(`Monitoring CPU temp sensor: ${sensorName}`);
                return;
              }
            }
          } catch {
            continue;
          }
        }
      }

      console.warn("No CPU temperature sensor found");
    } catch (error) {
      console.error("CPU temperature sensor detection failed:", error);
    }
  }

  private startMonitoring(): void {
    GLib.timeout_add(GLib.PRIORITY_LOW, SystemMonitor.UPDATE_INTERVAL, () => {
      this.updateMetrics();
      return GLib.SOURCE_CONTINUE;
    });

    // Less frequent disk checks
    GLib.timeout_add(GLib.PRIORITY_LOW, 5000, () => {
      this.updateDiskSpace();
      return GLib.SOURCE_CONTINUE;
    });
  }

  private async updateMetrics(): Promise<void> {
    await this.updateCpuMetrics();
    await this.updateCpuTemperature();
    this.updateMemoryMetrics();
    this.updateSwapMetrics();
    await this.updateGpuMetrics();
    this.updateNetworkMetrics();
    this.updateLoadAverage();
    this.updateUptime();
    this.updateProcessCount();
    this.checkThresholds();
  }

  private async updateCpuMetrics(): Promise<void> {
    GTop.glibtop_get_cpu(this.#cpu);

    const currentUsed = this.calculateCpuUsed(this.#cpu);
    const currentTotal = this.calculateCpuTotal(this.#cpu);
    const diffUsed = currentUsed - this.#lastCpuUsed;
    const diffTotal = currentTotal - this.#lastCpuTotal;

    this.cpuLoad =
      diffTotal > 0 ? Math.min(1, Math.max(0, diffUsed / diffTotal)) : 0;

    this.#lastCpuUsed = currentUsed;
    this.#lastCpuTotal = currentTotal;

    try {
      const frequencies = await this.parseCpuFrequencies();
      if (frequencies.length > 0) {
        this.cpuFrequency = Math.round(
          frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
        );
      }
    } catch (error) {
      console.error(`CPU frequency update failed: ${error}`);
    }
  }

  // GTop does not provide this
  private async updateCpuTemperature(): Promise<void> {
    if (!this.#cpuTempPath) return;

    try {
      const temp = await readFileAsync(this.#cpuTempPath);
      this.cpuTemperature = parseInt(temp.trim()) / 1000;
    } catch (error) {
      console.error("CPU temperature read failed:", error);
    }
  }

  private updateMemoryMetrics(): void {
    GTop.glibtop_get_mem(this.#memory);
    this.memoryUtilization = this.#memory.user / this.#memory.total;
    this.memoryUsed = this.formatBytes(this.#memory.user);
  }

  private updateSwapMetrics(): void {
    GTop.glibtop_get_swap(this.#swap);
    if (this.#swap.total > 0) {
      this.swapUtilization = this.#swap.used / this.#swap.total;
      this.swapUsed = this.formatBytes(this.#swap.used);
    } else {
      this.swapUtilization = 0;
      this.swapUsed = "0 B";
    }
  }

  private updateNetworkMetrics(): void {
    if (!this.#networkInterface) return;

    try {
      GTop.glibtop_get_netload(this.#netload, this.#networkInterface);

      const currentBytesIn = this.#netload.bytes_in;
      const currentBytesOut = this.#netload.bytes_out;

      const intervalSec = SystemMonitor.UPDATE_INTERVAL / 1000;
      this.networkDownloadSpeed =
        (currentBytesIn - this.#lastNetBytesIn) / intervalSec;
      this.networkUploadSpeed =
        (currentBytesOut - this.#lastNetBytesOut) / intervalSec;

      this.#lastNetBytesIn = currentBytesIn;
      this.#lastNetBytesOut = currentBytesOut;
    } catch (error) {
      console.error("Network metrics update failed:", error);
    }
  }

  private updateLoadAverage(): void {
    GTop.glibtop_get_loadavg(this.#loadavg);
    this.loadAverage1 = this.#loadavg.loadavg[0];
    this.loadAverage5 = this.#loadavg.loadavg[1];
    this.loadAverage15 = this.#loadavg.loadavg[2];
  }

  private updateUptime(): void {
    GTop.glibtop_get_uptime(this.#uptime);
    this.uptime = Math.floor(this.#uptime.uptime);
  }

  private updateProcessCount(): void {
    const proclist = new GTop.glibtop_proclist();
    GTop.glibtop_get_proclist(proclist, GTop.GLIBTOP_KERN_PROC_ALL, 0);
    this.processCount = proclist.number;
  }

  private async updateGpuMetrics(): Promise<void> {
    if (this.#gpuType === "nvidia") {
      try {
        const output = await execAsync(
          "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits",
        );
        const [util, memUsed, memTotal, temp] = output
          .trim()
          .split(",")
          .map(Number);

        this.gpuUtilization = util / 100;
        this.gpuMemoryUsed = memUsed * 1024 * 1024;
        this.gpuMemoryTotal = memTotal * 1024 * 1024;
        this.gpuTemperature = temp;
      } catch (error) {
        console.error("Nvidia GPU monitoring failed:", error);
      }
    } else if (this.#gpuType === "amd" && this.#gpuBusyPath) {
      try {
        const gpuBusy = await readFileAsync(this.#gpuBusyPath);
        this.gpuUtilization = parseInt(gpuBusy.trim()) / 100;

        if (this.#gpuMemUsedPath && this.#gpuMemTotalPath) {
          try {
            const memUsed = await readFileAsync(this.#gpuMemUsedPath);
            const memTotal = await readFileAsync(this.#gpuMemTotalPath);
            this.gpuMemoryUsed = parseInt(memUsed.trim());
            this.gpuMemoryTotal = parseInt(memTotal.trim());
          } catch (error) {
            console.warn("AMD GPU memory read failed:", error);
          }
        }

        if (this.#gpuTempPath) {
          try {
            const temp = await readFileAsync(this.#gpuTempPath);
            this.gpuTemperature = parseInt(temp.trim()) / 1000;
          } catch (error) {
            console.warn("AMD GPU temperature read failed:", error);
          }
        }
      } catch (error) {
        console.error("AMD GPU monitoring failed:", error);
      }
    }
  }

  private async updateDiskSpace(): Promise<void> {
    try {
      const disks: DiskInfo[] = [];
      const seenDevices = new Set<string>();

      const _mounts = await readFileAsync("/proc/mounts");
      const mountLines = _mounts.split("\n").filter((line) => {
        return (
          line.startsWith("/dev/") &&
          !line.includes("loop") &&
          !line.includes("tmpfs")
        );
      });

      for (const line of mountLines) {
        const parts = line.split(" ");
        const device = parts[0];
        const mountPoint = parts[1];

        if (seenDevices.has(device)) {
          continue;
        }

        try {
          const file = Gio.File.new_for_path(mountPoint);
          const info = file.query_filesystem_info("filesystem::*", null);

          const total = info.get_attribute_uint64("filesystem::size");
          const free = info.get_attribute_uint64("filesystem::free");
          const used = total - free;

          if (total > 0) {
            seenDevices.add(device);
            disks.push({
              mountPoint,
              utilization: used / total,
              used: this.formatBytes(used),
              total: this.formatBytes(total),
              usedBytes: used,
              totalBytes: total,
            });
          }
        } catch (e) {
          continue;
        }
      }

      this.disks = disks;

      // Special treatment for home fs
      const homeDir = GLib.get_home_dir();
      const homeDisk = disks
        .filter((d) => homeDir.startsWith(d.mountPoint))
        .sort((a, b) => b.mountPoint.length - a.mountPoint.length)[0];

      if (homeDisk) {
        this.diskUtilization = homeDisk.utilization;
        this.diskUsed = homeDisk.used;
        this.diskTotal = homeDisk.total;
      }
    } catch (error) {
      console.error("Disk space update failed:", error);
    }
  }
  private checkThresholds(): void {
    if (this.cpuLoad > SystemMonitor.HIGH_CPU_THRESHOLD) {
      this.emit("high-cpu-usage", this.cpuLoad);
    }

    if (this.memoryUtilization > SystemMonitor.HIGH_MEMORY_THRESHOLD) {
      this.emit("high-memory-usage", this.memoryUtilization);
    }
  }

  private async parseCpuFrequencies(): Promise<number[]> {
    const content = await readFileAsync(SystemMonitor.CPU_INFO_PATH);

    return content
      .split("\n")
      .filter((line) => line.includes("cpu MHz"))
      .map((line) => {
        const value = line.split(":")[1]?.trim();
        return value ? parseFloat(value) : NaN;
      })
      .filter((freq) => !isNaN(freq));
  }

  private calculateCpuUsed(cpu: GTop.glibtop_cpu): number {
    return cpu.user + cpu.sys + cpu.nice + cpu.irq + cpu.softirq;
  }

  private calculateCpuTotal(cpu: GTop.glibtop_cpu): number {
    return this.calculateCpuUsed(cpu) + cpu.idle + cpu.iowait;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const exp = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, exp);
    return `${Math.round(value * 100) / 100} ${units[exp]}`;
  }

  @getter(Number)
  get cpuUsagePercent(): number {
    return Math.round(this.cpuLoad * 100);
  }

  @getter(Number)
  get memoryUsagePercent(): number {
    return Math.round(this.memoryUtilization * 100);
  }

  @getter(Number)
  get swapUsagePercent(): number {
    return Math.round(this.swapUtilization * 100);
  }

  @getter(String)
  get uptimeFormatted(): string {
    const days = Math.floor(this.uptime / 86400);
    const hours = Math.floor((this.uptime % 86400) / 3600);
    const minutes = Math.floor((this.uptime % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  @getter(String)
  get networkDownloadFormatted(): string {
    return `${this.formatBytes(this.networkDownloadSpeed)}/s`;
  }

  @getter(String)
  get networkUploadFormatted(): string {
    return `${this.formatBytes(this.networkUploadSpeed)}/s`;
  }

  @getter(Number)
  get gpuUtilizationPercent(): number {
    return Math.round(this.gpuUtilization * 100);
  }

  @getter(String)
  get gpuMemoryUsedFormatted(): string {
    return this.formatBytes(this.gpuMemoryUsed);
  }

  @getter(String)
  get gpuMemoryTotalFormatted(): string {
    return this.formatBytes(this.gpuMemoryTotal);
  }

  @getter(Number)
  get gpuMemoryUtilizationPercent(): number {
    if (this.gpuMemoryTotal === 0) return 0;
    return Math.round((this.gpuMemoryUsed / this.gpuMemoryTotal) * 100);
  }

  @getter(Number)
  get diskUsagePercent(): number {
    return Math.round(this.diskUtilization * 100);
  }

  @getter(Number)
  get totalDiskUtilization(): number {
    if (this.disks.length === 0) return 0;
    const totalUsed = this.disks.reduce((sum, d) => sum + d.usedBytes, 0);
    const totalSize = this.disks.reduce((sum, d) => sum + d.totalBytes, 0);
    return totalSize > 0 ? totalUsed / totalSize : 0;
  }

  @getter(Number)
  get totalDiskUtilizationPercent(): number {
    return Math.round(this.totalDiskUtilization * 100);
  }
}
