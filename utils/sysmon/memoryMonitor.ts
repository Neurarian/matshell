import { register, property } from "ags/gobject";
import GTop from "gi://GTop";
import {
  HardwareMonitor,
  MonitorConfig,
  ByteFormatter,
  safeDivide,
} from "./base";

@register({ GTypeName: "MemoryMonitor" })
export class MemoryMonitor extends HardwareMonitor {
  private memory = new GTop.glibtop_mem();
  private swap = new GTop.glibtop_swap();

  @property(Number) utilization = 0;
  @property(Number) usagePercent = 0;
  @property(String) used = "0 B";
  @property(String) total = "0 B";
  @property(Number) swapUtilization = 0;
  @property(Number) swapUsagePercent = 0;
  @property(String) swapUsed = "0 B";
  @property(String) swapTotal = "0 B";

  initialize(): void {
    this.initializeStaticMetrics();
    this.startMonitoring(MonitorConfig.UPDATE_INTERVAL);
  }

  async update(): Promise<void> {
    this.updateMemoryMetrics();
    this.updateSwapMetrics();
  }

  private initializeStaticMetrics(): void {
    GTop.glibtop_get_mem(this.memory);
    this.total = ByteFormatter.format(this.memory.total);

    GTop.glibtop_get_swap(this.swap);
    this.swapTotal = ByteFormatter.format(this.swap.total);
  }

  private updateMemoryMetrics(): void {
    GTop.glibtop_get_mem(this.memory);

    this.utilization = safeDivide(this.memory.user, this.memory.total);
    this.used = ByteFormatter.format(this.memory.user);
    this.usagePercent = Math.round(this.utilization * 100);
  }

  private updateSwapMetrics(): void {
    GTop.glibtop_get_swap(this.swap);

    if (this.swap.total > 0) {
      this.swapUtilization = safeDivide(this.swap.used, this.swap.total);
      this.swapUsed = ByteFormatter.format(this.swap.used);
      this.swapUsagePercent = Math.round(this.swapUtilization * 100);
    } else {
      this.swapUtilization = 0;
      this.swapUsed = "0 B";
      this.swapUsagePercent = 0;
    }
  }
}
