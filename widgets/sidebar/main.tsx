// widgets/sidebar/Sidebar.tsx
import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createState } from "ags";
import ClockWidget from "./widgets/ClockWidget";
import WeatherWidget from "./widgets/WeatherWidget";
import TemplateWidget from "./widgets/BaseTemplateWidget";

/** ---------- Header (spacer only) ---------- **/
function Header() {
  return <box cssClasses={["sidebar-spacer"]} />;
}

/** ---------- Sidebar Window ---------- **/
export default function Sidebar(props: { children?: Gtk.Widget[] } = {}) {
  const { TOP, LEFT, BOTTOM } = Astal.WindowAnchor;
  const [visible] = createState(false);
  const { children = [] } = props;

  return (
    <window
      name="sidebar"
      cssClasses={["sidebar"]}
      anchor={TOP | LEFT | BOTTOM}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      layer={Astal.Layer.TOP}
      application={app}
      visible={visible}
      widthRequest={320}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        hexpand={false}
        vexpand={true}
        spacing={12}
      >
        <Header />

        {/* Built-in widgets */}
        <ClockWidget />
        <Gtk.Separator />
        <WeatherWidget />
        <TemplateWidget />


        {/* Extra widgets */}
        {children}
      </box>
    </window>
  );
}
