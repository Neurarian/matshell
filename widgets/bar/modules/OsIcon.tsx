import app from "ags/gtk4/app";
import options from "options";
export default function OsIcon() {
  return (
    <button onClicked={() => app.toggle_window("sidebar")}>
      <image
        iconName={options["bar.modules.os-icon.type"]((t) => String(t))}
        cssClasses={["OsIcon"]}
      />
    </button>
  );
}
