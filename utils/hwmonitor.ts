import GObject, { register, getter } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import GTop from "gi://GTop";
import { readFile } from "ags/file";

@register({ GTypeName: "SystemMonitor" })
export default class SystemMonitor extends GObject.Object {
  // @ts-ignore - notify method is provided by GObject at runtime
  notify(property: string): void;
  static instance: SystemMonitor;
  private static readonly CPU_INFO_PATH = "/proc/cpuinfo";

  // On lower intervals the tooltips start to take forever to show
  private static readonly UPDATE_INTERVAL = 1000;
  private static readonly BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

  // State tracking
  #memory = new GTop.glibtop_mem();
  #cpuLoad = 0;
  #lastUsed = 0;
  #lastTotal = 0;
  #cpuFreq = 0;

  // Notification batching
  #pendingNotifications = new Set<string>();
  #notifyTimeoutId: number | null = null;

  static get_default(): SystemMonitor {
    return this.instance || (this.instance = new SystemMonitor());
  }

  constructor() {
    super();
    this.initializeBaseMetrics();
    this.startMonitoring();
  }

  private initializeBaseMetrics(): void {
    GTop.glibtop_get_mem(this.#memory);
    const initialCpu = new GTop.glibtop_cpu();
    GTop.glibtop_get_cpu(initialCpu);
    this.#lastUsed = this.calculateCpuUsed(initialCpu);
    this.#lastTotal = this.calculateCpuTotal(initialCpu);
  }

  private startMonitoring(): void {
    // Use GTK4's idle priority for better integration with event loop
    GLib.timeout_add(GLib.PRIORITY_LOW, SystemMonitor.UPDATE_INTERVAL, () => {
      this.updateMetrics();
      return GLib.SOURCE_CONTINUE;
    });
  }

  // Unified update method to minimize main thread blocking
  private updateMetrics(): void {
    // Update CPU metrics
    const currentCpu = new GTop.glibtop_cpu();
    GTop.glibtop_get_cpu(currentCpu);

    const currentUsed = this.calculateCpuUsed(currentCpu);
    const currentTotal = this.calculateCpuTotal(currentCpu);
    const [diffUsed, diffTotal] = [
      currentUsed - this.#lastUsed,
      currentTotal - this.#lastTotal,
    ];

    this.#cpuLoad =
      diffTotal > 0 ? Math.min(1, Math.max(0, diffUsed / diffTotal)) : 0;
    this.#lastUsed = currentUsed;
    this.#lastTotal = currentTotal;

    // Update memory metrics
    GTop.glibtop_get_mem(this.#memory);

    // Update CPU frequency
    try {
      const frequencies = this.parseCpuFrequencies();
      if (frequencies.length > 0) {
        this.#cpuFreq =
          frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
      }
    } catch (error) {
      console.error(`CPU frequency update failed: ${error}`);
    }

    // Queue all notifications in batch
    this.queueNotifications([
      "memory-utilization",
      "memory-used",
      "cpu-load",
      "cpu-frequency",
    ]);
  }

  // Batch notification method
  private queueNotifications(properties: string[]): void {
    for (const prop of properties) {
      this.#pendingNotifications.add(prop);
    }

    if (this.#notifyTimeoutId === null) {
      // Process notifications on next frame for better GTK4 integration
      this.#notifyTimeoutId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT_IDLE,
        100,
        () => {
          this.processNotifications();
          this.#notifyTimeoutId = null;
          return GLib.SOURCE_REMOVE;
        },
      );
    }
  }

  private processNotifications(): void {
    for (const prop of this.#pendingNotifications) {
      this.notify(prop);
    }
    this.#pendingNotifications.clear();
  }

  private parseCpuFrequencies(): number[] {
    return readFile(SystemMonitor.CPU_INFO_PATH)
      .split("\n")
      .filter((line) => line.includes("cpu MHz"))
      .map((line) => {
        const value = line.split(":")[1]?.trim();
        return value ? parseFloat(value) : NaN;
      })
      .filter((freq) => !isNaN(freq));
  }

  // Helper functions
  private calculateCpuUsed(cpu: GTop.glibtop_cpu): number {
    return cpu.user + cpu.sys + cpu.nice + cpu.irq + cpu.softirq;
  }

  private calculateCpuTotal(cpu: GTop.glibtop_cpu): number {
    return this.calculateCpuUsed(cpu) + cpu.idle + cpu.iowait;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const exp = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, exp);
    return `${Math.round(value * 100) / 100} ${SystemMonitor.BYTE_UNITS[exp]}`;
  }

  // Property getters - updated to use @getter decorator
  @getter(Number)
  get memoryUtilization(): number {
    return this.#memory.user / this.#memory.total;
  }

  @getter(String)
  get memoryUsed(): string {
    return this.formatBytes(this.#memory.user);
  }

  @getter(Number)
  get cpuLoad(): number {
    return this.#cpuLoad;
  }

  @getter(Number)
  get cpuFrequency(): number {
    return Math.round(this.#cpuFreq);
  }
}
