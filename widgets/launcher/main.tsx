import app from "ags/gtk4/app";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import Pango from "gi://Pango";
import Apps from "gi://AstalApps";
import { createState, For } from "ags";

const MAX_ITEMS = 8;

function hide() {
  app.get_window("launcher")!.hide();
}

function AppButton({ app }: { app: Apps.Application }) {
  return (
    <button
      cssClasses={["AppButton"]}
      onClicked={() => {
        hide();
        app.launch();
      }}
    >
      <box>
        <image iconName={app.iconName} />
        <box valign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
          <label
            cssClasses={["name"]}
            ellipsize={Pango.EllipsizeMode.END}
            xalign={0}
            label={app.name}
          />
          {app.description && (
            <label
              cssClasses={["description"]}
              wrap
              xalign={0}
              label={app.description}
            />
          )}
        </box>
      </box>
    </button>
  );
}

export default function Applauncher() {
  const { CENTER } = Gtk.Align;
  const apps = new Apps.Apps();
  const [width, setWidth] = createState(1000);
  const [text, setText] = createState("");
  const [visible, _setVisible] = createState(false);

  // Create computed list from text state
  const list = text((text) =>
    text ? apps.fuzzy_query(text).slice(0, MAX_ITEMS) : [],
  );

  const onEnter = () => {
    const query = apps.fuzzy_query(text);
    if (query && query.length > 0) {
      query[0].launch();
      hide();
    }
  };

  let searchEntry: Gtk.Entry;

  return (
    <window
      name="launcher"
      visible={visible}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      onShow={(self) => {
        setWidth(self.get_current_monitor().geometry.width);
      }}
      onNotifyVisible={({ visible }) => {
        if (visible && searchEntry) {
          searchEntry.set_text("");
          searchEntry.grab_focus();
        }
      }}
    >
      <Gtk.EventControllerKey
        onKeyPressed={({ widget }, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            widget.hide();
          }
        }}
      />
      <box>
        <button widthRequest={width((w) => w / 2)} onClicked={hide} />
        <box
          hexpand={false}
          orientation={Gtk.Orientation.VERTICAL}
          valign={Gtk.Align.CENTER}
        >
          <button onClicked={hide} />
          <box
            widthRequest={500}
            cssClasses={["applauncher"]}
            orientation={Gtk.Orientation.VERTICAL}
          >
            <box cssClasses={["search"]}>
              <image iconName="system-search-symbolic" />
              <entry
                $={(self) => (searchEntry = self)}
                placeholderText="Search..."
                text={text}
                onNotifyText={(self) => setText(self.text)}
                primaryIconSensitive={true}
                onActivate={onEnter}
                hexpand={true}
              />
            </box>
            <box
              spacing={6}
              orientation={Gtk.Orientation.VERTICAL}
              cssClasses={["apps"]}
              visible={list((l) => l.length > 0)}
            >
              <For each={list}>{(app) => <AppButton app={app} />}</For>
            </box>
            <box
              halign={CENTER}
              cssClasses={["not-found"]}
              orientation={Gtk.Orientation.VERTICAL}
              visible={list((l) => l.length === 0)}
            >
              <image iconName="system-search-symbolic" />
              <label label="No match found" />
            </box>
          </box>
          <button onClicked={hide} />
        </box>
        <button widthRequest={width((w) => w / 2)} onClicked={hide} />
      </box>
    </window>
  );
}
