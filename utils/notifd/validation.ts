import { Gtk, Gdk } from "ags/gtk4";
import GLib from "gi://GLib?version=2.0";

export const isIcon = (icon: string) => {
  const display = Gdk.Display.get_default();
  if (!display) return false;
  const iconTheme = Gtk.IconTheme.get_for_display(display);
  return iconTheme.has_icon(icon);
};

export const fileExists = (path: string) =>
  GLib.file_test(path, GLib.FileTest.EXISTS);
