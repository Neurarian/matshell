import { Gtk } from "astal/gtk4";
import { execAsync, bind } from "astal";
import Wp from "gi://AstalWp";
import Brightness from "utils/brightness.ts";

export const Sliders = () => {
  const speaker = Wp.get_default()!.audio.defaultSpeaker;
  const microphone = Wp.get_default()!.get_default_microphone();
  const brightness = Brightness.get_default();

  return (
    <box cssClasses={["sliders"]} vertical>
      <box cssClasses={["volume"]}>
        <button onClicked={() => execAsync("pwvucontrol")}>
          <image iconName={bind(speaker, "volumeIcon")} />
        </button>
        <slider
          onChangeValue={(self) => {
            speaker.volume = self.value;
          }}
          value={bind(speaker, "volume")}
          valign={Gtk.Align.CENTER}
          hexpand={true}
        />
      </box>
      <box
        cssClasses={["volume"]}
        visible={bind(microphone, "path").as(
          (mic) => mic !== null,
        )}
      >
        <button onClicked={() => execAsync("pwvucontrol")}>
          <image iconName={bind(microphone, "volumeIcon")} />
        </button>
        <slider
          onChangeValue={(self) => {
            microphone.volume = self.value;
            print(microphone.get_path());
          }}
          value={bind(microphone, "volume")}
          valign={Gtk.Align.CENTER}
          hexpand={true}
        />
      </box>
      <box cssClasses={["brightness"]} visible={brightness.hasBacklight}>
        <image iconName="display-brightness-symbolic" />
        <slider
          value={bind(brightness, "screen")}
          onChangeValue={(self) => {
            brightness.screen = self.value;
          }}
          min={0.1}
          valign={Gtk.Align.CENTER}
          hexpand={true}
        />
      </box>
    </box>
  );
};
