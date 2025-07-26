import app from "ags/gtk4/app";
import Net from "./modules/Net.tsx";
import Blue from "./modules/Bluetooth.tsx";
import Batt from "./modules/Battery.tsx";

export default function SystemInfo() {
  return (
    <button
      cssClasses={["system-menu-toggler"]}
      onClicked={() => app.toggle_window("system-menu")}
    >
      <box>
        <Net />
        <Blue />
        <Batt />
      </box>
    </button>
  );
}
