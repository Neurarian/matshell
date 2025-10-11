import { register, property } from "ags/gobject";
import GTop from "gi://GTop";
import { HardwareMonitor } from "./base";
import { MonitorConfig } from ".";

@register({ GTypeName: "SystemInfoMonitor" })
export class SystemInfoMonitor extends HardwareMonitor {
  private loadavg = new GTop.glibtop_loadavg();
  private uptimeData = new GTop.glibtop_uptime();

  @property(Number) loadAverage1 = 0;
  @property(Number) loadAverage5 = 0;
  @property(Number) loadAverage15 = 0;
  @property(Number) uptime = 0;
  @property(String) uptimeFormatted = "0m";
  @property(Number) processCount = 0;

  initialize(): void {
    this.startMonitoring(MonitorConfig.UPDATE_INTERVAL);
  }

  async update(): Promise<void> {
    this.updateLoadAverage();
    this.updateUptime();
    this.updateProcessCount();
  }

  private updateLoadAverage(): void {
    GTop.glibtop_get_loadavg(this.loadavg);
    this.loadAverage1 = this.loadavg.loadavg[0];
    this.loadAverage5 = this.loadavg.loadavg[1];
    this.loadAverage15 = this.loadavg.loadavg[2];
  }

  private updateUptime(): void {
    GTop.glibtop_get_uptime(this.uptimeData);
    this.uptime = Math.floor(this.uptimeData.uptime);

    const days = Math.floor(this.uptime / 86400);
    const hours = Math.floor((this.uptime % 86400) / 3600);
    const minutes = Math.floor((this.uptime % 3600) / 60);

    if (days > 0) {
      this.uptimeFormatted = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      this.uptimeFormatted = `${hours}h ${minutes}m`;
    } else {
      this.uptimeFormatted = `${minutes}m`;
    }
  }

  private updateProcessCount(): void {
    const proclist = new GTop.glibtop_proclist();
    GTop.glibtop_get_proclist(proclist, GTop.GLIBTOP_KERN_PROC_ALL, 0);
    this.processCount = proclist.number;
  }
}
