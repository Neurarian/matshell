import { createBinding } from "ags";
import Gsk from "gi://Gsk";
import { execAsync } from "ags/process";
import SystemMonitor from "utils/sysmon";
import { CircularProgressBar } from "widgets/common/circularprogress";
import options from "options";

export default function Cpu() {
  const sysmon = SystemMonitor.get_default();

  return (
    <box cssClasses={["bar-hw-cpu-box"]}>
      <CircularProgressBar
        percentage={createBinding(sysmon.cpu, "load")}
        radiusFilled={true}
        inverted={true}
        startAt={-0.75}
        endAt={0.25}
        lineWidth={3.5}
        lineCap={Gsk.LineCap.ROUND}
      >
        <button
          cssClasses={["cpu-inner"]}
          onClicked={async () => {
            try {
              await execAsync(options["app.resource-monitor"].get());
            } catch (error) {
              console.error("Error:", error);
            }
          }}
          label="memory"
          tooltipText={createBinding(
            sysmon.cpu,
            "frequency",
          )((f) => `${f} MHz`)}
        />
      </CircularProgressBar>
    </box>
  );
}
