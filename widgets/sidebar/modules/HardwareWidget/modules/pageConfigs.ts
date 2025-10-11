import SystemMonitor, { ByteFormatter } from "utils/sysmon";
import { PageConfig, MetricConfig } from "./types";
import { createBinding, createComputed, Accessor } from "ags";
const sysmon = SystemMonitor.get_default();

const tempMetric = (
  monitor: typeof sysmon.cpu | typeof sysmon.gpu,
  label: string,
  tooltip: string,
): MetricConfig => ({
  type: "bar",
  label,
  value: createBinding(
    monitor,
    "temperature",
  )((t) => (t > 0 ? Math.min(t / 100, 1) : 0)),
  detail: createBinding(
    monitor,
    "temperature",
  )((t) => (t > 0 ? `${Math.round(t)}°` : "N/A")),
  tooltip,
});

const displayMetric = (
  label: string,
  icon: string,
  detail: Accessor<string>,
  tooltip: string,
): MetricConfig => ({
  type: "display",
  label,
  icon,
  detail,
  tooltip,
});

export const pageConfigs: PageConfig[] = [
  {
    id: "cpu",
    label: "CPU",
    icon: "memory",
    mainPercentage: createBinding(sysmon.cpu, "load"),
    mainLabel: createBinding(sysmon.cpu, "usagePercent")((p) => `${p}%`),
    mainTooltip: createBinding(
      sysmon.cpu,
      "frequency",
    )((f) => `CPU Frequency: ${f} MHz`),
    leftMetric: tempMetric(sysmon.cpu, "TEMP", "CPU Temperature"),
    rightMetric: displayMetric(
      "LOAD",
      "weight",
      createBinding(sysmon.system, "loadAverage1")((l) => l.toFixed(1)),
      "Load Average (1min)",
    ),
  },
  {
    id: "memory",
    label: "RAM",
    icon: "memory_alt",
    mainPercentage: createBinding(sysmon.memory, "utilization"),
    mainLabel: createBinding(sysmon.memory, "usagePercent")((p) => `${p}%`),
    mainTooltip: createComputed(
      [
        createBinding(sysmon.memory, "used"),
        createBinding(sysmon.memory, "total"),
      ],
      (used, total) => `Memory: ${used} / ${total}`,
    ),
    leftMetric: {
      type: "bar",
      label: "SWAP",
      value: createBinding(sysmon.memory, "swapUtilization"),
      detail: createBinding(sysmon.memory, "swapUsed"),
      tooltip: createComputed(
        [
          createBinding(sysmon.memory, "swapUsed"),
          createBinding(sysmon.memory, "swapTotal"),
        ],
        (used, total) => `Swap: ${used} / ${total}`,
      ),
    },
    rightMetric: displayMetric(
      "PROC",
      "manufacturing",
      createBinding(sysmon.system, "processCount")((c) => `${c}`),
      "Process Count",
    ),
  },
  {
    id: "gpu",
    label: "GPU",
    icon: "developer_board",
    mainPercentage: createBinding(sysmon.gpu, "utilization"),
    mainLabel: createBinding(sysmon.gpu, "utilizationPercent")((p) => `${p}%`),
    mainTooltip: "GPU Utilization",
    leftMetric: tempMetric(sysmon.gpu, "TEMP", "GPU Temperature"),
    rightMetric: {
      type: "bar",
      label: "VRAM",
      value: createComputed(
        [
          createBinding(sysmon.gpu, "memoryUsed"),
          createBinding(sysmon.gpu, "memoryTotal"),
        ],
        (used, total) => (total > 0 ? used / total : 0),
      ),
      detail: createBinding(sysmon.gpu, "memoryUsedFormatted"),
      tooltip: createComputed(
        [
          createBinding(sysmon.gpu, "memoryUsedFormatted"),
          createBinding(sysmon.gpu, "memoryTotalFormatted"),
        ],
        (used, total) => `VRAM: ${used} / ${total}`,
      ),
    },
  },
  {
    id: "disk",
    label: "Disk",
    icon: "hard_drive",
    mainPercentage: createBinding(sysmon.disk, "totalUtilization"),
    mainLabel: createBinding(
      sysmon.disk,
      "totalUtilizationPercent",
    )((p) => `${p}%`),
    mainTooltip: createComputed(
      [createBinding(sysmon.disk, "disks")],
      (disks) => {
        const totalUsed = disks.reduce((sum, d) => sum + d.usedBytes, 0);
        const totalSize = disks.reduce((sum, d) => sum + d.totalBytes, 0);
        return `Total: ${ByteFormatter.format(totalUsed)} / ${ByteFormatter.format(totalSize)}`;
      },
    ),
    leftMetric: displayMetric(
      "DOWN",
      "download",
      createBinding(sysmon.network, "downloadFormatted"),
      "Download Speed",
    ),
    rightMetric: displayMetric(
      "UP",
      "upload",
      createBinding(sysmon.network, "uploadFormatted"),
      "Upload Speed",
    ),
    diskList: createBinding(sysmon.disk, "disks"),
  },
];
