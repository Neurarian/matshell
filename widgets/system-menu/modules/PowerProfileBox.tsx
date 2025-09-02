import PowerProfiles from "gi://AstalPowerProfiles";
import { Gtk } from "ags/gtk4";
import { createBinding, createState, For } from "ags";

const [isExpanded, setIsExpanded] = createState(false);
const powerProfiles = PowerProfiles.get_default();

const formatProfileName = (name: string) =>
  name.charAt(0).toUpperCase() + name.substring(1).replace("-", " ");

const ProfileItem = ({ icon, label, onClicked, cssClasses = [""] }) => (
  <button hexpand={true} onClicked={onClicked}>
    <box cssClasses={cssClasses} hexpand={true} halign={Gtk.Align.START}>
      <image iconName={icon} />
      <label label={label} />
    </box>
  </button>
);

export const PowerProfileBox = () => {
  const profiles = createBinding(powerProfiles, "profiles");

  return (
    <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["power-profiles"]}>
      <ProfileItem
        cssClasses={["current-profile"]}
        icon={createBinding(powerProfiles, "icon-name")}
        label={createBinding(
          powerProfiles,
          "active-profile",
        )(formatProfileName)}
        onClicked={() => setIsExpanded((prev) => !prev)}
      />
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={300}
        revealChild={isExpanded}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["profile-options"]}
        >
          <For each={profiles}>
            {(profile: PowerProfiles.Profile) => (
              <ProfileItem
                icon={`power-profile-${profile.profile}-symbolic`}
                label={formatProfileName(profile.profile)}
                onClicked={() => {
                  powerProfiles.set_active_profile(profile.profile);
                  setIsExpanded(false);
                }}
              />
            )}
          </For>
        </box>
      </revealer>
    </box>
  );
};
