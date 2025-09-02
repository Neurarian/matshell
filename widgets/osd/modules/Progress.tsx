import { Gtk } from "ags/gtk4";
import { createState, onCleanup, Accessor } from "ags";
import Pango from "gi://Pango";
import Wp from "gi://AstalWp";
import Brightness from "utils/brightness";
import Bluetooth from "gi://AstalBluetooth";

interface OnScreenProgressProps {
  visible: boolean | Accessor<boolean>;
  setVisible: (visible: boolean) => void;
}

export default function OnScreenProgress({
  visible,
  setVisible,
}: OnScreenProgressProps) {
  const [value, setValue] = createState(0);
  const [label, setLabel] = createState("");
  const [icon, setIcon] = createState("");
  const [hasProgress, setHasProgress] = createState(true);

  let currentTimeout: any = null;
  const TIMEOUT_DELAY = 2000;

  const show = (
    val: number,
    text: string,
    iconName: string,
    progress = true,
  ) => {
    setValue(val);
    setLabel(text);
    setIcon(iconName);
    setHasProgress(progress);
    setVisible(true);

    if (currentTimeout) clearTimeout(currentTimeout);
    currentTimeout = setTimeout(() => setVisible(false), TIMEOUT_DELAY);
  };

  // Audio
  [
    Wp.get_default()?.get_default_speaker(),
    Wp.get_default()?.get_default_microphone(),
  ]
    .filter(Boolean)
    .forEach((endpoint) => {
      const id = endpoint!.connect("notify::volume", () =>
        show(
          endpoint!.volume,
          endpoint!.description || "",
          endpoint!.volumeIcon,
        ),
      );
      onCleanup(() => endpoint!.disconnect(id));
    });

  // Brightness
  try {
    const brightness = Brightness.get_default();
    const id = brightness.connect("notify::screen", () =>
      show(
        brightness.screen,
        "Screen Brightness",
        "display-brightness-symbolic",
      ),
    );
    onCleanup(() => brightness.disconnect(id));
  } catch {}

  // Bluetooth: with my bt adapter only functional when in active mode
  const bluetooth = Bluetooth.get_default();
  const btId = bluetooth.connect("notify::devices", () => {
    bluetooth.devices.forEach((device) => {
      device.connect("notify::connected", () => {
        const message = device.connected
          ? `Connected: ${device.name || device.address}`
          : `Disconnected: ${device.name || device.address}`;

        show(0, message, device.icon || "bluetooth-active-symbolic", false);
      });
    });
  });

  onCleanup(() => {
    try {
      bluetooth.disconnect(btId);
    } catch {}
  });

  return (
    <revealer
      revealChild={visible}
      transitionType={Gtk.RevealerTransitionType.CROSSFADE}
    >
      <box cssClasses={["osd"]}>
        <image iconName={icon} />
        <box orientation={Gtk.Orientation.VERTICAL}>
          <label
            label={label}
            maxWidthChars={24}
            widthRequest={200}
            halign={Gtk.Align.CENTER}
            ellipsize={Pango.EllipsizeMode.END}
            wrap={false}
          />
          <levelbar value={value} visible={hasProgress} />
        </box>
      </box>
    </revealer>
  );
}
