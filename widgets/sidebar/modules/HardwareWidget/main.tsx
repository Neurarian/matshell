import { Gtk } from "ags/gtk4";
import {
  createState,
  onCleanup,
  createBinding,
  createComputed,
  Accessor,
} from "ags";
import { HardwarePage } from "./modules/HardwarePage";
import { MetricConfig, PageConfig } from "./modules/types";
import SystemMonitor from "utils/hwmonitor";

export default function HardwareMonitorWidget() {
  const sysmon = SystemMonitor.get_default();
  const [currentPage, setCurrentPage] = createState("cpu");

  const tempMetric = (
    prop: "cpuTemperature" | "gpuTemperature",
    label: string,
  ): MetricConfig => ({
    type: "bar",
    label,
    value: createBinding(
      sysmon,
      prop,
    )((t) => (t > 0 ? Math.min(t / 100, 1) : 0)),
    detail: createBinding(
      sysmon,
      prop,
    )((t) => (t > 0 ? `${Math.round(t)}°` : "N/A")),
    tooltip: `${prop === "cpuTemperature" ? "CPU" : "GPU"} Temperature`,
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

  const pageConfigs: PageConfig[] = [
    {
      id: "cpu",
      label: "CPU",
      icon: "memory",
      mainPercentage: createBinding(sysmon, "cpuLoad"),
      mainLabel: createBinding(sysmon, "cpuUsagePercent")((p) => `${p}%`),
      mainTooltip: createBinding(
        sysmon,
        "cpuFrequency",
      )((f) => `CPU Frequency: ${f} MHz`),
      leftMetric: tempMetric("cpuTemperature", "TEMP"),
      rightMetric: displayMetric(
        "LOAD",
        "weight",
        createBinding(sysmon, "loadAverage1")((l) => l.toFixed(1)),
        "Load Average (1min)",
      ),
    },
    {
      id: "memory",
      label: "RAM",
      icon: "memory_alt",
      mainPercentage: createBinding(sysmon, "memoryUtilization"),
      mainLabel: createBinding(sysmon, "memoryUsagePercent")((p) => `${p}%`),
      mainTooltip: createComputed(
        [
          createBinding(sysmon, "memoryUsed"),
          createBinding(sysmon, "memoryTotal"),
        ],
        (used, total) => `Memory: ${used} / ${total}`,
      ),
      leftMetric: {
        type: "bar",
        label: "SWAP",
        value: createBinding(sysmon, "swapUtilization"),
        detail: createBinding(sysmon, "swapUsed")((used) => used),
        tooltip: createComputed(
          [
            createBinding(sysmon, "swapUsed"),
            createBinding(sysmon, "swapTotal"),
          ],
          (used, total) => `Swap: ${used} / ${total}`,
        ),
      },
      rightMetric: displayMetric(
        "PROC",
        "manufacturing",
        createBinding(sysmon, "processCount")((c) => `${c}`),
        "Process Count",
      ),
    },
    {
      id: "gpu",
      label: "GPU",
      icon: "developer_board",
      mainPercentage: createBinding(sysmon, "gpuUtilization"),
      mainLabel: createBinding(sysmon, "gpuUtilizationPercent")((p) => `${p}%`),
      mainTooltip: "GPU Utilization",
      leftMetric: tempMetric("gpuTemperature", "TEMP"),
      rightMetric: {
        type: "bar",
        label: "VRAM",
        value: createComputed(
          [
            createBinding(sysmon, "gpuMemoryUsed"),
            createBinding(sysmon, "gpuMemoryTotal"),
          ],
          (used, total) => (total > 0 ? used / total : 0),
        ),
        detail: createBinding(sysmon, "gpuMemoryUsedFormatted"),
        tooltip: createComputed(
          [
            createBinding(sysmon, "gpuMemoryUsedFormatted"),
            createBinding(sysmon, "gpuMemoryTotalFormatted"),
          ],
          (used, total) => `VRAM: ${used} / ${total}`,
        ),
      },
    },
    {
      id: "disk",
      label: "Disk",
      icon: "hard_drive",
      mainPercentage: createBinding(sysmon, "totalDiskUtilization"),
      mainLabel: createBinding(
        sysmon,
        "totalDiskUtilizationPercent",
      )((p) => `${p}%`),
      mainTooltip: createComputed([createBinding(sysmon, "disks")], (disks) => {
        const totalUsed = disks.reduce((sum, d) => sum + d.usedBytes, 0);
        const totalSize = disks.reduce((sum, d) => sum + d.totalBytes, 0);
        return `Total: ${sysmon.formatBytes(totalUsed)} / ${sysmon.formatBytes(totalSize)}`;
      }),
      leftMetric: displayMetric(
        "DOWN",
        "download",
        createBinding(sysmon, "networkDownloadFormatted"),
        "Download Speed",
      ),
      rightMetric: displayMetric(
        "UP",
        "upload",
        createBinding(sysmon, "networkUploadFormatted"),
        "Upload Speed",
      ),
      diskList: createBinding(sysmon, "disks"),
    },
  ];

  return (
    <box
      class="hardware-monitor-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
    >
      <box
        class="hw-header"
        orientation={Gtk.Orientation.HORIZONTAL}
        hexpand
        spacing={6}
      >
        <label
          label="Hardware Monitor"
          class="hw-header-title"
          halign={Gtk.Align.CENTER}
          hexpand
        />
      </box>
      <Gtk.Separator />
      <box
        class="hw-nav"
        orientation={Gtk.Orientation.HORIZONTAL}
        homogeneous
        spacing={2}
      >
        {pageConfigs.map((page) => (
          <button
            cssClasses={currentPage((current) =>
              current === page.id
                ? ["nav-button", "button"]
                : ["nav-button", "button-disabled"],
            )}
            onClicked={() => setCurrentPage(page.id)}
          >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
              <label label={page.icon} cssClasses={["nav-icon"]} />
              <label label={page.label} cssClasses={["nav-label"]} />
            </box>
          </button>
        ))}
      </box>
      <box cssClasses={["hw-content"]}>
        <stack
          cssClasses={["hw-stack"]}
          transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
          transitionDuration={200}
          $={(stack) => {
            const unsubscribe = currentPage.subscribe(() => {
              stack.visibleChildName = currentPage.get();
            });
            onCleanup(unsubscribe);
          }}
        >
          {pageConfigs.map((config) => {
            const content = <HardwarePage {...config} />;

            return (
              <box
                $type="named"
                name={config.id}
                cssClasses={[`hw-page-${config.id}`]}
                orientation={Gtk.Orientation.VERTICAL}
              >
                {config.diskList ? (
                  <scrolledwindow
                    minContentHeight={120}
                    hscrollbarPolicy={Gtk.PolicyType.NEVER}
                    vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                    cssClasses={["hw-scroll"]}
                  >
                    {content}
                  </scrolledwindow>
                ) : (
                  content
                )}
              </box>
            );
          })}
        </stack>
      </box>
    </box>
  );
}
