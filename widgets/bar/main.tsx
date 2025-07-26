import app from "ags/gtk4/app";
import { Astal, Gtk, Gdk } from "ags/gtk4";
import { SysTray, hasTrayItems } from "./modules/SysTray.tsx";
import Separator from "./modules/Separator.tsx";
import Workspaces from "./modules/Workspaces.tsx";
import Mem from "./modules/Mem.tsx";
import Cpu from "./modules/Cpu.tsx";
import { CavaDraw } from "widgets/music/modules/cava";
import Media from "./modules/Media.tsx";
import { hasActivePlayers } from "utils/mpris.ts";
import SystemInfo from "./modules/SystemInfo/main.tsx";
import Time from "./modules/Time.tsx/";
import OsIcon from "./modules/OsIcon.tsx";
import options from "options.ts";

function Bar({ gdkmonitor, ...props }: any) {
  console.log("Bar initialization started");

  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

  return (
    <window
      visible
      name="bar"
      namespace="bar"
      cssClasses={options["bar.style"]((s) => [
        "Bar",
        `bar-style-${s ?? "expanded"}`,
      ])}
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      application={app}
      anchor={options["bar.position"]((pos) => {
        switch (pos) {
          case "top":
            return TOP | LEFT | RIGHT;
          case "bottom":
            return BOTTOM | LEFT | RIGHT;
          default:
            return TOP | LEFT | RIGHT;
        }
      })}
      marginTop={options["bar.position"]((pos) => (pos === "top" ? 5 : 0))}
      marginLeft={5}
      marginRight={5}
      marginBottom={options["bar.position"]((pos) =>
        pos === "bottom" ? 5 : 0,
      )}
      {...props}
    >
      <overlay>
        <box
          $type={"overlay"}
          canTarget={false}
          visible={options["bar.modules.cava.show"]}
        >
          <CavaDraw vexpand hexpand style={options["bar.modules.cava.style"]} />
        </box>
        <centerbox cssClasses={["centerbox"]}>
          <box hexpand halign={Gtk.Align.START} $type="start">
            <box visible={options["bar.modules.showOsIcon"]}>
              <OsIcon />
            </box>
            <Workspaces />
          </box>
          <box visible={hasActivePlayers} $type="center">
            <Media />
          </box>
          <box hexpand halign={Gtk.Align.END} $type="end">
            <SysTray />
            <Separator visible={hasTrayItems} />
            <Mem />
            <Cpu />
            <Separator />
            <SystemInfo />
            <Separator />
            <Time />
          </box>
        </centerbox>
      </overlay>
    </window>
  );
}

export default function (monitor: Gdk.Monitor) {
  const windowName = `bar-${monitor.get_connector()}`;

  function createBar() {
    console.log(`Creating bar for monitor ${monitor.get_connector()}`);
    return <Bar gdkmonitor={monitor} name={windowName} />;
  }

  // Create the initial bar
  createBar();

  return windowName;
}
