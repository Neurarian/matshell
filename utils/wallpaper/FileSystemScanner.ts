import Gio from "gi://Gio";
import GLib from "gi://GLib";

export interface ScanOptions {
  includeHidden: boolean;
  maxDepth: number;
}

export class FileSystemScanner {
  scan(directory: string, options: ScanOptions): Gio.File[] {
    if (!GLib.file_test(directory, GLib.FileTest.EXISTS)) {
      console.warn(`Directory does not exist: ${directory}`);
      return [];
    }

    if (!GLib.file_test(directory, GLib.FileTest.IS_DIR)) {
      return [];
    }

    return this.scanRecursive(
      directory,
      options.maxDepth,
      options.includeHidden,
    );
  }

  private scanRecursive(
    dir: string,
    level: number,
    includeHidden: boolean,
  ): Gio.File[] {
    if (level < 0) return [];

    const files: Gio.File[] = [];

    try {
      const enumerator = Gio.File.new_for_path(dir).enumerate_children(
        "standard::name,standard::type",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const file = enumerator.get_child(info);
        const basename = file.get_basename();

        if (basename?.startsWith(".") && !includeHidden) continue;

        const type = file.query_file_type(Gio.FileQueryInfoFlags.NONE, null);

        if (type === Gio.FileType.DIRECTORY && level > 0) {
          const path = file.get_path();
          if (path) {
            files.push(...this.scanRecursive(path, level - 1, includeHidden));
          }
        } else {
          files.push(file);
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dir}:`, error);
    }

    return files;
  }

  isImageFile(file: Gio.File): boolean {
    try {
      const info = file.query_info(
        Gio.FILE_ATTRIBUTE_STANDARD_CONTENT_TYPE,
        Gio.FileQueryInfoFlags.NONE,
        null,
      );
      return info.get_content_type()?.startsWith("image/") ?? false;
    } catch {
      return false;
    }
  }
}
