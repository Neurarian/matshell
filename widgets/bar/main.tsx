import app from "ags/gtk4/app";
import { For, createBinding, createComputed } from "ags";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import { compositor } from "utils/compositor/detector";
import { SysTray, hasTrayItems } from "./modules/SysTray.tsx";
import Separator from "./modules/Separator.tsx";
import { HyprlandWorkspaces, RiverWorkspaces } from "./modules/Workspaces.tsx";
import { Clients } from "./modules/Clients.tsx";
import Mem from "./modules/Mem.tsx";
import Cpu from "./modules/Cpu.tsx";
import { CavaDraw } from "widgets/music/modules/cava";
import Media from "./modules/Media.tsx";
import { hasActivePlayers } from "utils/mpris.ts";
import SystemInfo from "./modules/SystemInfo/main.tsx";
import Time from "./modules/Time.tsx";
import OsIcon from "./modules/OsIcon.tsx";
import ScreenCorners from "widgets/common/screencorners/main.tsx";
import options from "options.ts";

function Bar({ gdkmonitor, ...props }: any) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

  const marginTop = createComputed(
    [options["bar.style"], options["bar.position"]],
    (style, position) => {
      if (style === "corners") return 0;
      return position === "top" ? 5 : 0;
    },
  );

  const marginBottom = createComputed(
    [options["bar.style"], options["bar.position"]],
    (style, position) => {
      if (style === "corners") return 0;
      return position === "bottom" ? 5 : 0;
    },
  );

  const horizontalMargin = createComputed([options["bar.style"]], (style) =>
    style === "corners" ? 0 : 5,
  );

  const showCavaExpanded = createComputed(
    [options["bar.modules.cava.enable"], options["bar.style"]],
    (cavaEnabled, barStyle) => {
      return cavaEnabled && ["expanded", "corners"].includes(String(barStyle));
    },
  );

  const showCavaFloating = createComputed(
    [options["bar.modules.cava.enable"], options["bar.style"]],
    (cavaEnabled, barStyle) => {
      return cavaEnabled && barStyle === "floating";
    },
  );

  const showClients = createComputed(
    [options["bar.modules.clients.enable"], compositor.clients],
    (clientsEnabled, allClients) => {
      if (!clientsEnabled) return false;
      const monitorName = gdkmonitor?.get_connector() || null;
      const monitorClients = monitorName
        ? allClients.filter((c) => c.monitor === monitorName)
        : allClients;
      return monitorClients.length > 0;
    },
  );

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
      marginTop={marginTop}
      marginLeft={horizontalMargin}
      marginRight={horizontalMargin}
      marginBottom={marginBottom}
      {...props}
    >
      <overlay>
        <box
          $type={"overlay"}
          canTarget={false}
          visible={showCavaExpanded((s) => Boolean(s))}
        >
          <CavaDraw
            vexpand
            hexpand
            style={options["bar.modules.cava.style"]((value) => String(value))}
          />
        </box>
        <centerbox cssClasses={["centerbox"]}>
          <box hexpand halign={Gtk.Align.START} $type="start">
            <box
              visible={options["bar.modules.os-icon.enable"]((value) =>
                Boolean(value),
              )}
            >
              <OsIcon />
            </box>
            {compositor.name === "river" ? (
              <RiverWorkspaces gdkmonitor={gdkmonitor} />
            ) : (
              <>
                <HyprlandWorkspaces />
                <box visible={showClients}>
                  <Separator />
                  <Clients gdkmonitor={gdkmonitor} />
                </box>
              </>
            )}
          </box>
          <box
            visible={hasActivePlayers}
            $type="center"
            overflow={options["bar.style"]((style) =>
              style === "floating" ? Gtk.Overflow.HIDDEN : Gtk.Overflow.VISIBLE,
            )}
          >
            <overlay>
              <box
                $type={"overlay"}
                canTarget={false}
                visible={showCavaFloating((s) => Boolean(s))}
              >
                <CavaDraw
                  vexpand
                  hexpand
                  style={options["bar.modules.cava.style"]((value) =>
                    String(value),
                  )}
                />
              </box>
              <Media />
            </overlay>
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

function MonitorSetup({ monitor }: { monitor: Gdk.Monitor }) {
  const corners = <ScreenCorners monitor={monitor} />;
  const bar = <Bar gdkmonitor={monitor} />;
  return bar;
}

export default function () {
  const monitors = createBinding(app, "monitors");
  return (
    <For each={monitors} cleanup={(win) => (win as Gtk.Window).destroy()}>
      {(monitor) => <MonitorSetup monitor={monitor} />}
    </For>
  );
}
