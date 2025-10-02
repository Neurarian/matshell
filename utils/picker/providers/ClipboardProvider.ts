import { register } from "ags/gobject";
import { execAsync, subprocess, Process } from "ags/process";
import { BaseProvider } from "../SearchProvider.ts";
import GLib from "gi://GLib?version=2.0";
import { ClipboardItem, ProviderConfig } from "../types.ts";
import Fuse from "utils/fuse.js";

@register({ GTypeName: "ClipboardProvider" })
export class ClipboardProvider extends BaseProvider {
  readonly config: ProviderConfig = {
    command: "clip",
    icon: "Content_Paste_Search",
    name: "Clipboard",
    placeholder: "Search clipboard history...",
    component: "list",
    maxResults: 8,
    features: {
      refresh: true,
      delete: true,
      wipe: true,
    },
  };

  private allItems: ClipboardItem[] = [];
  private currentQuery: string = "";
  private fuse!: Fuse;
  private cliphistWatcher: Process | null = null;

  private contentToIdMap = new Map<string, string>();

  constructor() {
    super();
    this.command = "clip";
    this.initClipboardWatcher();
  }

  private async initClipboardWatcher(): Promise<void> {
    try {
      const cliphist = GLib.find_program_in_path("cliphist");
      const wlPaste = GLib.find_program_in_path("wl-paste");

      if (!cliphist || !wlPaste) {
        console.error(
          "cliphist / wl-paste not found. Clipboard manager will not work.",
        );
        return;
      }

      if (await this.isWatcherAlreadyRunning()) {
        return;
      }

      this.cliphistWatcher = subprocess(
        ["wl-paste", "--watch", "cliphist", "store"],
        (stdout: string) => {
          console.debug("Clipboard watcher stdout:", stdout);
        },
        (stderr: string) => {
          console.warn("Clipboard watcher stderr:", stderr);
        },
      );
    } catch (error) {
      console.error("Failed to start clipboard watcher:", error);
    }
  }

  private async isWatcherAlreadyRunning(): Promise<boolean> {
    try {
      const psOutput = await execAsync(["pgrep", "-f", "wl-paste.*cliphist"]);
      return psOutput.trim().length > 0;
    } catch {
      return false;
    }
  }

  async search(query: string): Promise<void> {
    this.setLoading(true);
    this.currentQuery = query;

    try {
      if (this.allItems.length === 0) {
        await this.loadClipboardItems();
      }

      if (query.trim().length === 0) {
        // Frecency defaults
        this.setDefaultResults(this.allItems);
      } else {
        const fuseResults = this.fuse.search(query, {
          limit: this.config.maxResults,
        });
        const results = fuseResults.map((result) => result.item);
        this.setResults(results);
      }
    } catch (e) {
      console.error("Clipboard search failed:", e);
      this.setResults([]);
    } finally {
      this.setLoading(false);
    }
  }

  // ID based on content hash (cliphist IDs change)
  private generateId(content: string): string {
    // Mini hash function for content-based ID
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const hashStr = Math.abs(hash).toString(36);

    const existingId = this.contentToIdMap.get(content);
    if (existingId) {
      return existingId;
    }

    const ID = `clip_${hashStr}`;
    this.contentToIdMap.set(content, ID);
    return ID;
  }

  private async loadClipboardItems(): Promise<void> {
    try {
      const output = await execAsync(["cliphist", "list"]);
      const lines = output.split("\n").filter(Boolean);

      this.allItems = lines.map((line: string, index: number) => {
        // Parse cliphist format: "<id>\t<content>"
        const tabIndex = line.indexOf("\t");
        const cliphistId =
          tabIndex !== -1 ? line.substring(0, tabIndex) : index.toString();
        const actualContent =
          tabIndex !== -1 ? line.substring(tabIndex + 1) : line;

        // Generate ID based on content, cliphist's changing ID doesn't work for caching
        const ID = this.generateId(actualContent);

        // Content for display
        const normalizedContent = actualContent
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return {
          id: ID,
          name:
            normalizedContent.length > 80
              ? normalizedContent.slice(0, 77) + "..."
              : normalizedContent,
          description: `#${cliphistId} : ${this.getContentTypeDescription(actualContent)}`,
          content: line, // Original line for cliphist operations
          searchableText: actualContent.toLowerCase(),
          cliphistId: cliphistId, // Keep original ID
        };
      });

      this.updateFuse();
      console.log(`Loaded ${this.allItems.length} clipboard entries`);
    } catch (error) {
      console.error("Failed to load clipboard items:", error);
      this.allItems = [];
      this.updateFuse();
    }
  }

  private getContentTypeDescription(content: string): string {
    // Detect content type
    // TODO:: Expand content type regex
    if (content.match(/^https?:\/\//)) {
      return "URL";
    }
    if (content.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      return "Email";
    }
    if (content.match(/^\d+$/)) {
      return "Number";
    }
    if (content.match(/^[\d\s\-\+\(\)/]+$/) && content.length > 3) {
      return "Phone/ID";
    }
    if (content.length >= 100) {
      return "Long text";
    }
    return `Text (${content.length} chars)`;
  }

  private updateFuse(): void {
    this.fuse = new Fuse(this.allItems, {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "searchableText", weight: 0.8 },
        { name: "description", weight: 0.3 },
      ],
      includeScore: true,
      threshold: 0.4,
      location: 0,
      distance: 200,
      minMatchCharLength: 2,
      ignoreLocation: true,
      ignoreFieldNorm: false,
      useExtendedSearch: false,
      shouldSort: true,
      isCaseSensitive: false,
    });
  }

  async activate(item: ClipboardItem): Promise<void> {
    try {
      // Shell escaping for clipboard content
      const escapedContent = item.content.replace(/'/g, "'\"'\"'");
      await execAsync([
        "bash",
        "-c",
        `printf '%s' '${escapedContent}' | cliphist decode | wl-copy`,
      ]);
    } catch (e) {
      console.error("Failed to activate clipboard entry:", e);
    }
  }

  async refresh(): Promise<void> {
    this.allItems = [];
    await this.search(this.currentQuery);
  }

  async delete(item: ClipboardItem): Promise<void> {
    try {
      const escapedContent = item.content.replace(/'/g, "'\"'\"'");
      await execAsync([
        "bash",
        "-c",
        `printf '%s' '${escapedContent}' | cliphist delete`,
      ]);

      this.allItems = this.allItems.filter((i) => i.id !== item.id);
      this.updateFuse();

      await this.search(this.currentQuery);
    } catch (e) {
      console.error("Failed to delete clipboard entry:", e);
    }
  }

  async wipe(): Promise<void> {
    try {
      await execAsync(["cliphist", "wipe"]);

      // Clear all caches
      this.allItems = [];
      this.contentToIdMap.clear();
      this.updateFuse();
      this.setResults([]);
    } catch (e) {
      console.error("Failed to clear clipboard:", e);
    }
  }

  dispose(): void {
    if (this.cliphistWatcher) {
      try {
        this.cliphistWatcher.kill();
        console.log("Clipboard watcher stopped");
      } catch (error) {
        console.error("Failed to stop clipboard watcher:", error);
      }
    }
  }
}
