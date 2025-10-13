// widgets/sidebar/Sidebar.tsx
import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createState, createComputed, For } from "ags";
import QuickActionsWidget from "./modules/QuickActionWidget";
import options from "options";
import { gdkmonitor } from "utils/monitors";
import { SIDEBAR_WIDGETS } from "./widgetRegistry";
import { SidebarWidgetId } from "./types";

export default function Sidebar(
  props: {
    children?: Gtk.Widget | JSX.Element | (Gtk.Widget | JSX.Element)[];
  } = {},
) {
  const { TOP, LEFT, BOTTOM } = Astal.WindowAnchor;
  const { NORMAL, EXCLUSIVE } = Astal.Exclusivity;
  const [visible] = createState(false);
  const { children = [] } = props;

  const filteredWidgets = createComputed(
    [options["sidebar.widget-order"], options["sidebar.enabled-widgets"]],
    (order, enabled) => {
      return order.filter((id: SidebarWidgetId) => enabled.includes(id));
    },
  );

  return (
    <window
      name="sidebar"
      cssClasses={["sidebar"]}
      anchor={TOP | LEFT | BOTTOM}
      exclusivity={options["bar.style"]((style) => {
        if (style === "corners") return NORMAL;
        return EXCLUSIVE;
      })}
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      visible={visible}
      widthRequest={320}
      gdkmonitor={gdkmonitor}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        vexpand={true}
      >
        {/* Dynamic widgets */}
        <box orientation={Gtk.Orientation.VERTICAL}>
          <For each={filteredWidgets}>
            {(widgetId, index) => {
              const widgetDef = SIDEBAR_WIDGETS[widgetId];
              if (!widgetDef) return <box />;

              const Component = widgetDef.component;
              const showSeparator =
                (widgetDef.separatorAfter ?? false) &&
                index.get() < filteredWidgets.get().length - 1;

              return (
                <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                  <Component />
                  {showSeparator && <Gtk.Separator />}
                </box>
              );
            }}
          </For>
        </box>

        <box vexpand />
        <QuickActionsWidget />
        {children}
      </box>
    </window>
  );
}
