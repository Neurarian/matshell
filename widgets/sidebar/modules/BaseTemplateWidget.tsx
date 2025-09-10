// ~/.config/ags/widgets/sidebar/modules/BaseTemplateWidget.tsx
import { Gtk } from "ags/gtk4";

interface BaseItemProps {
  title: string;
  value: string;
  icon: string;
}

function BaseItem({ title, value, icon }: BaseItemProps) {
  return (
    <box class="item" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <label label={title} class="item-title" />
      <image iconName={icon} pixelSize={28} class="item-icon" />
      <label label={value} class="item-value" />
    </box>
  );
}

interface HeaderData {
  title: string;
  subtitle: string;
  extra: string;
}

interface ItemData {
  title: string;
  value: string;
  icon: string;
}

interface WidgetData {
  header: HeaderData;
  items: ItemData[];
}

export default function BaseTemplateWidget() {
  const data: WidgetData = {
    header: {
      title: "Hello World",
      subtitle: "Base Widget",
      extra: "Extra info",
    },
    items: [
      { title: "One", value: "A", icon: "starred-symbolic" },
      { title: "Two", value: "B", icon: "starred-symbolic" },
      { title: "Three", value: "C", icon: "starred-symbolic" },
    ],
  };

  return (
    <box class="base-widget" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
      <box
        class="header-row"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={16}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          halign={Gtk.Align.START}
          spacing={2}
        >
          <image
            iconName="applications-system-symbolic"
            pixelSize={64}
            class="header-icon"
          />
          <label
            class="header-subtitle"
            label={data.header.subtitle}
            halign={Gtk.Align.CENTER}
          />
        </box>

        <box
          orientation={Gtk.Orientation.VERTICAL}
          hexpand={true}
          valign={Gtk.Align.CENTER}
          halign={Gtk.Align.END}
          spacing={2}
        >
          <label
            class="header-title"
            label={data.header.title}
            halign={Gtk.Align.END}
          />
          <label
            class="header-extra"
            label={data.header.extra}
            halign={Gtk.Align.END}
          />
        </box>
      </box>

      {
        new Gtk.Separator({
          orientation: Gtk.Orientation.HORIZONTAL,
          halign: Gtk.Align.FILL,
          valign: Gtk.Align.CENTER,
        })
      }

      <box class="items-row" spacing={16} halign={Gtk.Align.CENTER}>
        {data.items.map((it) => (
          <BaseItem {...it} />
        ))}
      </box>
    </box>
  );
}
