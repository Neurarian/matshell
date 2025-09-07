// ~/.config/ags/widgets/sidebar/BaseTemplateWidget.js
import Gtk from "gi://Gtk?version=4.0";

/** ---------- Base Item ---------- **/
function BaseItem(title, value, icon) {
    return (
        <box class="item" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <label label={title} class="item-title" />
            <image iconName={icon} pixelSize={28} class="item-icon" />
            <label label={value} class="item-value" />
        </box>
    );
}

/** ---------- Base Widget ---------- **/
export default function BaseTemplateWidget() {
    const data = {
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
            {/* Header row */}
            <box class="header-row" orientation={Gtk.Orientation.HORIZONTAL} spacing={16}>
                <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START} spacing={2}>
                    <image iconName="applications-system-symbolic" pixelSize={64} class="header-icon" />
                    <label class="header-subtitle" label={data.header.subtitle} halign={Gtk.Align.CENTER} />
                </box>

                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    hexpand={true}
                    valign={Gtk.Align.CENTER}
                    halign={Gtk.Align.END}
                    spacing={2}
                >
                    <label class="header-title" label={data.header.title} halign={Gtk.Align.END} />
                    <label class="header-extra" label={data.header.extra} halign={Gtk.Align.END} />
                </box>
            </box>

            {/* Divider */}
            {new Gtk.Separator({
                orientation: Gtk.Orientation.HORIZONTAL,
                halign: Gtk.Align.FILL,
                valign: Gtk.Align.CENTER,
            })}

            {/* Items Row */}
            <box class="items-row" spacing={16} halign={Gtk.Align.CENTER}>
                {data.items.map((it) =>
                    BaseItem(it.title, it.value, it.icon)
                )}
            </box>
        </box>
    );
}
