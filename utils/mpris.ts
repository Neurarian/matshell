import Mpris from "gi://AstalMpris";
import GLib from "gi://GLib?version=2.0";
import { createBinding, createExternal } from "ags";
import { exec } from "ags/process";

const mpris = Mpris.get_default();
const MEDIA_CACHE_PATH = GLib.get_user_cache_dir() + "/media";
const blurredPath = MEDIA_CACHE_PATH + "/blurred";

export function findPlayer(players: Mpris.Player[]): Mpris.Player | undefined {
  // try to get the first active player
  const activePlayer = players.find(
    (p) => p.playback_status === Mpris.PlaybackStatus.PLAYING,
  );
  if (activePlayer) return activePlayer;

  // otherwise get the first "working" player
  return players.find((p) => p.title !== undefined);
}

export function mprisStateIcon(status: Mpris.PlaybackStatus): string {
  return status === Mpris.PlaybackStatus.PLAYING
    ? "media-playback-pause-symbolic"
    : "media-playback-start-symbolic";
}

export function generateBackground(coverpath: string | null): string {
  if (!coverpath) return "";

  // Construct blurred path using path.join for safe concatenation
  const relativePath = coverpath.substring(MEDIA_CACHE_PATH.length + 1); // +1 to skip slash
  const blurred = GLib.build_filenamev([blurredPath, relativePath]);

  // Create parent directory for blurred file
  const blurredDir = GLib.path_get_dirname(blurred);
  !GLib.file_test(blurredDir, GLib.FileTest.EXISTS) &&
    GLib.mkdir_with_parents(blurredDir, 0o755);

  try {
    // Using async can cause race condition and idk how to use
    // this function in a binding if the entire function is async.
    exec(`magick "${coverpath}" -blur 0x22 "${blurred}"`);
  } catch (e) {
    console.error("Background generation failed:", e);
    return ""; // Fallback
  }
  return blurred;
}

export function lengthStr(length: number) {
  const min = Math.floor(length / 60).toString();
  const sec = Math.floor(length % 60)
    .toString()
    .padStart(2, "0");
  return min + ":" + sec;
}

export function filterActivePlayers(players: Mpris.Player[]) {
  return players.filter((player: Mpris.Player) => {
    // Check for essential properties that indicate a usable player
    if (!player.title && !player.artist) {
      return false;
    }

    // Check playback status
    // Only include players that are playing or paused
    if (player.playback_status) {
      return [
        Mpris.PlaybackStatus.PLAYING,
        Mpris.PlaybackStatus.PAUSED,
      ].includes(player.playback_status);
    }

    return true;
  });
}

export const activePlayers = createExternal(mpris.get_players(), (set) => {
  // poll players periodically as binding to "players" does not seem to work reliably
  const interval = setInterval(() => {
    set(mpris.get_players());
  }, 1000);

  return () => {
    clearInterval(interval);
  };
});

export const hasActivePlayers = activePlayers(
  (players) => filterActivePlayers(players).length > 0,
);

export const firstActivePlayer = activePlayers((players) => {
  const active = filterActivePlayers(players);
  return active.length > 0 ? active[0] : null;
});
