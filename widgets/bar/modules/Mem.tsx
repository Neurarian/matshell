import { createBinding } from "ags";
import Gsk from "gi://Gsk";
import { execAsync } from "ags/process";
import SystemMonitor from "utils/hwmonitor";
import { CircularProgressBar } from "widgets/common/circularprogress";

export default function Mem() {
  const sysmon = SystemMonitor.get_default();

  return (
    <box cssClasses={["bar-hw-ram-box"]}>
      <CircularProgressBar
        percentage={createBinding(sysmon, "memoryUtilization")}
        radiusFilled={true}
        inverted={true}
        startAt={-0.75}
        endAt={0.25}
        lineWidth={3.5}
        lineCap={Gsk.LineCap.ROUND}
      >
        <button
          cssClasses={["ram-inner"]}
          onClicked={async () => {
            try {
              await execAsync("missioncenter");
            } catch (error) {
              console.error("Error:", error);
            }
          }}
          label={"memory_alt"}
          tooltipText={createBinding(sysmon, "memoryUsed")}
        />
      </CircularProgressBar>
    </box>
  );
}
