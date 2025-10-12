import { Gtk } from "ags/gtk4";
import { For } from "ags";
import options from "options";
import { SIDEBAR_WIDGETS } from "widgets/sidebar/widgetRegistry";
import { SidebarWidgetId } from "widgets/sidebar/types";

export default function WidgetManagerPage() {
  const widgetOrder = options["sidebar.widget-order"];
  const enabledWidgets = options["sidebar.enabled-widgets"];

  const moveWidget = (fromIndex: number, toIndex: number) => {
    const currentOrder = [...widgetOrder.get()];
    const [movedItem] = currentOrder.splice(fromIndex, 1);
    currentOrder.splice(toIndex, 0, movedItem);

    widgetOrder.value = currentOrder;
  };

  const toggleWidget = (widgetId: SidebarWidgetId) => {
    const current = enabledWidgets.get();
    const newEnabled = current.includes(widgetId)
      ? current.filter((id) => id !== widgetId)
      : [...current, widgetId];

    enabledWidgets.value = newEnabled;
  };

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={5}>
      <scrolledwindow
        minContentHeight={115}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        cssClasses={["settings-scroll"]}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <For each={widgetOrder}>
            {(widgetId, index) => {
              const widget = SIDEBAR_WIDGETS[widgetId];
              const canDisable = widget.canDisable ?? true;
              const orderLength = widgetOrder((order) => order.length);

              return (
                <box cssClasses={["option-row", "widget-item"]} spacing={8}>
                  {canDisable ? (
                    <switch
                      cssClasses={["option-switch"]}
                      active={enabledWidgets((list) => list.includes(widgetId))}
                      onNotifyActive={() => toggleWidget(widgetId)}
                    />
                  ) : (
                    <box hexpand cssClasses={["option-switch-placeholder"]}>
                      <label
                        label="Lock"
                        hexpand
                        halign={Gtk.Align.CENTER}
                        cssClasses={["placeholder-icon"]}
                      />
                    </box>
                  )}
                  <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={2}
                    hexpand
                    cssClasses={["widget-info"]}
                  >
                    <box spacing={6}>
                      <label label={widget.icon} cssClasses={["widget-icon"]} />
                      <label label={widget.name} cssClasses={["widget-name"]} />
                    </box>
                    <label
                      label={widget.description}
                      cssClasses={["widget-description"]}
                      halign={Gtk.Align.START}
                    />
                  </box>
                  <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={2}
                    cssClasses={["widget-controls"]}
                  >
                    <button
                      cssClasses={index((i) => [
                        "reorder-button",
                        "button",
                        i === 0 ? "button-disabled" : "",
                      ])}
                      sensitive={index((i) => i !== 0)}
                      onClicked={() => moveWidget(index.get(), index.get() - 1)}
                    >
                      <label label="Arrow_Drop_Up" cssClasses={["icon"]} />
                    </button>
                    <button
                      cssClasses={index((i) => [
                        "reorder-button",
                        "button",
                        i === orderLength.get() - 1 ? "button-disabled" : "",
                      ])}
                      sensitive={index((i) => i !== orderLength.get() - 1)}
                      onClicked={() => moveWidget(index.get(), index.get() + 1)}
                    >
                      <label label="Arrow_Drop_Down" cssClasses={["icon"]} />
                    </button>
                  </box>
                </box>
              );
            }}
          </For>
        </box>
      </scrolledwindow>
    </box>
  );
}
