import { Gtk } from "ags/gtk4";
import { Accessor, For } from "ags";
import Gsk from "gi://Gsk";
import { execAsync } from "ags/process";
import { VerticalMetricBar } from "./VerticalMetricBar";
import { VerticalMetricDisplay } from "./VerticalMetricDisplay";
import { HorizontalDiskBar } from "./HorizontalDiskBar";
import { MetricConfig, PageConfig } from "./types";
import { CircularProgressBar } from "widgets/common/circularprogress";
import options from "options";

// Metric wrapper
function Metric({ config }: { config: MetricConfig }) {
  return config.type === "bar" ? (
    <VerticalMetricBar {...config} />
  ) : (
    <VerticalMetricDisplay {...config} />
  );
}

export function HardwarePage({
  mainPercentage,
  mainLabel,
  mainTooltip,
  leftMetric,
  rightMetric,
  diskList,
}: Omit<PageConfig, "id" | "label" | "icon">) {
  const openResourceMonitor = async () => {
    try {
      await execAsync(options["app.resource-monitor"].get());
    } catch (error) {
      console.error("Error opening resource monitor:", error);
    }
  };

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={16} hexpand>
      <box
        cssClasses={["hw-main-content"]}
        orientation={Gtk.Orientation.HORIZONTAL}
        halign={Gtk.Align.CENTER}
      >
        <Metric config={leftMetric} />
        <box valign={Gtk.Align.CENTER}>
          <CircularProgressBar
            percentage={mainPercentage}
            radiusFilled={true}
            inverted={true}
            startAt={-0.75}
            endAt={0.25}
            lineWidth={7}
            lineCap={Gsk.LineCap.ROUND}
          >
            <button
              cssClasses={["hw-main-circle"]}
              onClicked={openResourceMonitor}
              tooltipText={mainTooltip}
            >
              <label label={mainLabel} cssClasses={["hw-main-label"]} />
            </button>
          </CircularProgressBar>
        </box>
        <Metric config={rightMetric} />
      </box>

      {diskList && (
        <box
          cssClasses={["hw-disk-list"]}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={8}
        >
          <label
            label="Partitions"
            cssClasses={["disk-list-title"]}
            halign={Gtk.Align.START}
          />
          <For each={diskList}>{(disk) => <HorizontalDiskBar {...disk} />}</For>
        </box>
      )}
    </box>
  );
}
