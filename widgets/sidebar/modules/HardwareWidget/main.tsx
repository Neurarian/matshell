import { Gtk } from "ags/gtk4";
import { createState, onCleanup, Accessor } from "ags";
import { HardwarePage } from "./modules/HardwarePage";
import { pageConfigs } from "./modules/pageConfigs";
import SystemMonitor from "utils/sysmon";

export default function HardwareMonitorWidget() {
  const [currentPage, setCurrentPage] = createState("cpu");
  const sysmon = SystemMonitor.get_default();

  const availablePages = pageConfigs.filter(
    (page) => page.id !== "gpu" || sysmon.gpu.detected,
  );

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
        {availablePages.map((page) => (
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
          {availablePages.map((config) => {
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
