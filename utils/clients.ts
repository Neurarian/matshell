import Apps from "gi://AstalApps?version=0.1";
import Gio from "gi://Gio?version=2.0";

const apps = Apps.Apps.new();
const iconCache = new Map<string, string>();

// Strip NixOS wrapper pre-/suffix
export function normalizeClassName(className: string): string {
  if (className.startsWith(".")) {
    className = className.substring(1);
  }

  if (className.endsWith("-wrapped")) {
    className = className.replace(/-wrapped$/, "");
  }

  return className;
}

export function tryDesktopFileIcon(className: string): string | null {
  const desktopId = `${className}.desktop`;
  let appInfo = Gio.DesktopAppInfo.new(desktopId);

  if (appInfo) {
    const icon = appInfo.get_icon();
    if (icon) {
      return icon.to_string() ?? null;
    }
  }
  return null;
}

export function getAppIcon(
  clientClass: string,
  symbolic: boolean = false,
): string {
  if (!clientClass) return "application-x-executable";

  const cacheKey = symbolic ? `${clientClass}-symbolic` : clientClass;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const normalizedClass = normalizeClassName(clientClass);
  let resolvedIcon: string | null = null;

  // try finding matching app icon via AstalApps
  try {
    const matchedApps = apps.fuzzy_query(normalizedClass);
    if (matchedApps && matchedApps.length > 0) {
      const app = matchedApps[0];
      if (app && app.iconName) {
        resolvedIcon = app.iconName;
      }
    }
  } catch (e) {
    console.warn(`AstalApps lookup failed for ${normalizedClass}:`, e);
  }

  if (!resolvedIcon) {
    resolvedIcon = tryDesktopFileIcon(normalizedClass);
  }

  if (!resolvedIcon) {
    resolvedIcon = normalizedClass;
  }

  if (symbolic) {
    resolvedIcon = `${resolvedIcon}-symbolic`;
  }

  iconCache.set(cacheKey, resolvedIcon);
  return resolvedIcon;
}
