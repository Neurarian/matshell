import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createState, createBinding } from "ags";
import { OptionToggle } from "./modules/OptionToggle.tsx";
import { OptionSelect } from "./modules/OptionSelect.tsx";
import { Section } from "./modules/Section.tsx";
import { CategoryButton } from "./modules/CategoryButton.tsx";

import options from "options.ts";

export default function ControlPanel() {
  const { TOP, BOTTOM, LEFT } = Astal.WindowAnchor;

  const [visible, _setVisible] = createState(false);
  const [matshellSettingsExpanded, setMatshellSettingsExpanded] =
    createState(false);
  const [barExpanded, setBarExpanded] = createState(false);
  const [cavaExpanded, setCavaExpanded] = createState(false);
  const [systemMenuExpanded, setSystemMenuExpanded] = createState(false);

  const cavaStyleOptions = [
    "catmull_rom",
    "smooth",
    "bars",
    "jumping_bars",
    "dots",
    "circular",
    "particles",
    "wave_particles",
    "waterfall",
    "mesh",
  ];

  return (
    <window
      name="control-panel"
      cssClasses={["control-panel"]}
      anchor={options["bar.position"]((pos) => {
        switch (pos) {
          case "top":
            return TOP | LEFT;
          case "bottom":
            return BOTTOM | LEFT;
          default:
            return TOP | LEFT;
        }
      })}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.TOP}
      application={app}
      visible={visible}
      widthRequest={285}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <button
          onClicked={() => app.toggle_window("launcher")}
          cssClasses={["category-button"]}
        >
          <box hexpand={true}>
            <image iconName={"view-grid-symbolic"} />
            <label
              label={"App Launcher"}
              halign={Gtk.Align.START}
              hexpand={true}
            />
          </box>
        </button>
        <Gtk.Separator />
        <CategoryButton
          title="Matshell Settings"
          icon="preferences-system-symbolic"
          expanded={matshellSettingsExpanded}
          onToggle={() => setMatshellSettingsExpanded((prev) => !prev)}
        >
          {/* Idk why, but children wont render if first child is a box */}
          <></>
          <box orientation={Gtk.Orientation.VERTICAL}>
            {/* Bar Settings Category */}
            <CategoryButton
              title="Bar"
              icon="topbar-show-symbolic"
              expanded={barExpanded}
              onToggle={() => setBarExpanded((prev) => !prev)}
            >
              <></>
              <box orientation={Gtk.Orientation.VERTICAL}>
                <Section title="Bar Settings">
                  <OptionSelect
                    option="bar.position"
                    label="Position"
                    choices={["top", "bottom"]}
                  />
                  <OptionSelect
                    option="bar.style"
                    label="Style"
                    choices={["expanded", "floating", "corners"]}
                  />
                  <OptionToggle
                    option="bar.modules.showOsIcon"
                    label="Show OS Icon"
                  />
                </Section>
              </box>
            </CategoryButton>

            {/* Cava Settings Category */}
            <CategoryButton
              title="Cava"
              icon="audio-x-generic-symbolic"
              expanded={cavaExpanded}
              onToggle={() => setCavaExpanded((prev) => !prev)}
            >
              <></>
              <box orientation={Gtk.Orientation.VERTICAL}>
                <Section title="Cava Settings Bar">
                  <OptionToggle option="bar.modules.cava.show" label="Enable" />
                  <OptionSelect
                    option="bar.modules.cava.style"
                    label="Cava Style"
                    choices={cavaStyleOptions}
                  />
                  <OptionToggle
                    option="bar.modules.media.cava.show"
                    label="Enable Cover Cava"
                  />
                </Section>
                <Section title="Cava Settings Music Player">
                  <OptionToggle
                    option="musicPlayer.modules.cava.show"
                    label="Enable"
                  />
                  <OptionSelect
                    option="musicPlayer.modules.cava.style"
                    label="Cava Style"
                    choices={cavaStyleOptions}
                  />
                </Section>
              </box>
            </CategoryButton>

            {/* System Menu Settings Category */}
            <CategoryButton
              title="System Menu"
              icon="emblem-system-symbolic"
              expanded={systemMenuExpanded}
              onToggle={() => setSystemMenuExpanded((prev) => !prev)}
            >
              <></>
              <box orientation={Gtk.Orientation.VERTICAL}>
                <Section title="System Menu Settings">
                  <OptionToggle
                    option="system-menu.modules.wifi.enableGnomeControlCenter"
                    label="WiFi Advanced Settings"
                  />
                  <OptionToggle
                    option="system-menu.modules.bluetooth.enableOverskride"
                    label="BT Advanced Settings"
                  />
                </Section>
              </box>
            </CategoryButton>
          </box>
        </CategoryButton>
      </box>
    </window>
  );
}
