// widgets/sidebar/modules/MatshellSettingsWidget.tsx
import { Gtk } from "ags/gtk4";
import { createState, onCleanup } from "ags";
import {
  OptionSelectProps,
  OptionToggleProps,
  BAR_POSITION_OPTIONS,
  BAR_STYLE_OPTIONS,
  CAVA_STYLE_OPTIONS,
  OS_OPTIONS,
} from "utils/config";
import options from "options.ts";

function OptionSelect({ option, label, choices = [] }: OptionSelectProps) {
  return (
    <box cssClasses={["option-row", "option-select"]}>
      <label
        label={label}
        halign={Gtk.Align.START}
        hexpand={true}
        cssClasses={["option-label"]}
      />
      <Gtk.ComboBoxText
        cssClasses={["option-dropdown"]}
        onChanged={(self) => {
          const selectedIndex = self.get_active();
          const selectedChoice = choices[selectedIndex];
          options[option].value = selectedChoice.value;
        }}
        $={(self) => {
          // Populate items
          choices.forEach((choice) => {
            self.append_text(choice.label);
          });

          // Find current value and set active index
          const currentValue = String(options[option].get());
          const initialIndex = choices.findIndex(
            (choice) => choice.value === currentValue,
          );

          if (initialIndex !== -1) {
            self.set_active(initialIndex);
          } else {
            self.set_active(0);
            options[option].value = choices[0].value;
          }
        }}
      />
    </box>
  );
}

function OptionToggle({ option, label }: OptionToggleProps) {
  return (
    <box cssClasses={["option-row", "option-toggle"]}>
      <label
        label={label}
        halign={Gtk.Align.START}
        hexpand={true}
        cssClasses={["option-label"]}
      />
      <switch
        cssClasses={["option-switch"]}
        active={options[option]((value) => Boolean(value))}
        onNotifyActive={(self) => {
          console.log(`Toggle ${option} changed to: ${self.active}`);
          options[option].value = self.active;
        }}
      />
    </box>
  );
}

export default function MatshellSettingsWidget() {
  const [currentPage, setCurrentPage] = createState("bar");

  const pages = [
    { id: "bar", label: "Bar", icon: "Bottom_Navigation" },
    { id: "audio", label: "Audio", icon: "Cadence" },
    { id: "system", label: "System", icon: "Settings_Applications" },
  ];

  return (
    <box
      class="stacked-settings-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
    >
      {/* Header */}
      <box
        class="settings-header"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={6}
      >
        <label label="Matshell Settings" class="settings-title" hexpand />
      </box>

      <Gtk.Separator />

      {/* Navigation */}
      <box
        class="settings-nav"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={2}
        homogeneous
      >
        {pages.map((page) => (
          <button
            cssClasses={currentPage((current) =>
              current === page.id
                ? ["nav-button", "button"]
                : ["nav-button", "button-disabled"],
            )}
            onClicked={() => {
              setCurrentPage(page.id);
            }}
          >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
              <label label={page.icon} cssClasses={["nav-icon"]} />
              <label label={page.label} cssClasses={["nav-label"]} />
            </box>
          </button>
        ))}
      </box>

      {/* Scrollable Content Stack */}
      <scrolledwindow
        minContentHeight={150}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        cssClasses={["settings-scroll"]}
      >
        <stack
          cssClasses={["settings-stack"]}
          transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
          transitionDuration={200}
          $={(stack) => {
            const unsubscribe = currentPage.subscribe(() => {
              stack.visibleChildName = currentPage.get();
            });
            onCleanup(unsubscribe);
          }}
        >
          {/* Bar Settings */}
          <box
            $type="named"
            name="bar"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={5}
          >
            <OptionSelect
              option="bar.position"
              label="Position"
              choices={BAR_POSITION_OPTIONS}
            />
            <OptionSelect
              option="bar.style"
              label="Style"
              choices={BAR_STYLE_OPTIONS}
            />
            <OptionSelect
              option="bar.modules.os-icon.type"
              label="OS Icon"
              choices={OS_OPTIONS}
            />
            <OptionToggle
              option="bar.modules.os-icon.show"
              label="Show OS Icon"
            />
          </box>

          {/* Audio Settings */}
          <box
            $type="named"
            name="audio"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={5}
          >
            <label label="Bar Visualizer" cssClasses={["subsection-title"]} />
            <OptionToggle option="bar.modules.cava.show" label="Enable" />
            <OptionSelect
              option="bar.modules.cava.style"
              label="Cava Style"
              choices={CAVA_STYLE_OPTIONS}
            />
            <OptionToggle
              option="bar.modules.media.cava.show"
              label="Enable Cover Cava"
            />
            <Gtk.Separator />
            <label
              label="Music Player Visualizer"
              cssClasses={["subsection-title"]}
            />
            <OptionToggle
              option="musicPlayer.modules.cava.show"
              label="Enable"
            />
            <OptionSelect
              option="musicPlayer.modules.cava.style"
              label="Style"
              choices={CAVA_STYLE_OPTIONS}
            />
          </box>

          {/* System Settings */}
          <box
            $type="named"
            name="system"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={5}
          >
            <OptionToggle
              option="system-menu.modules.wifi-advanced.enable"
              label="WiFi Adv. Settings"
            />
            <OptionToggle
              option="system-menu.modules.bluetooth-advanced.enable"
              label="BT Adv. Settings"
            />
          </box>
        </stack>
      </scrolledwindow>
    </box>
  );
}
