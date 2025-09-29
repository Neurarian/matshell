import { execAsync } from "ags/process";

export interface ClipboardEntry {
  content: string;
  preview: string;
}

class ClipboardManager {
  entries: ClipboardEntry[] = [];
  filtered: ClipboardEntry[] = [];
  index = 0;
  mode: "select" | "delete" = "select";
  query = "";
  isVisible = false;
  window: any = null;
  updateCallbacks: (() => void)[] = [];
  focusSearch?: () => void;

  // Method to add update callbacks
  addUpdateCallback(callback: () => void) {
    this.updateCallbacks.push(callback);
  }

  // Method to trigger all update callbacks
  triggerUpdate() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error("Update callback error:", e);
      }
    });
  }

  // Maintain compatibility with existing onUpdate usage
  set onUpdate(callback: (() => void) | undefined) {
    if (callback) {
      this.updateCallbacks = [callback];
    } else {
      this.updateCallbacks = [];
    }
  }

  get onUpdate() {
    return this.updateCallbacks[0];
  }

  async load() {
    console.log("Loading clipboard entries...");
    // Clear existing entries to ensure fresh data
    this.entries = [];
    this.filtered = [];
    try {
      const clip = await execAsync(["clipvault", "list"]);
      const lines = clip.split("\n").filter(Boolean).slice(0, 50);
      console.log(`Found ${lines.length} clipboard entries`);
      this.entries = lines.map(line => {
        const parts = line.split('\t');
        const content = parts.slice(1).join('\t');
        return {
          content: line,
          preview: content.length > 100 ? content.slice(0, 97) + "..." : content,
        };
      });
      this.filter();
    } catch (e) {
      console.error("clipvault list failed:", e);
      this.entries = [];
      this.filtered = [];
      this.triggerUpdate();
    }
  }

  filter() {
    const q = this.query.toLowerCase();
    this.filtered = this.entries.filter(e => e.content.toLowerCase().includes(q));
    if (this.index >= this.filtered.length) {
      this.index = Math.max(0, this.filtered.length - 1);
    }
    this.triggerUpdate();
  }

  async clearAll() {
    try {
      await execAsync(["clipvault", "clear"]);
      await this.load();
    } catch (e) {
      console.error("Failed to clear clipboard:", e);
    }
  }

  async select(i = this.index) {
    if (!this.filtered[i]) return;
    const entry = this.filtered[i];
    const id = entry.content.split('\t')[0];
    try {
      if (this.mode === "delete") {
        await execAsync(["clipvault", "delete", id]);
        await this.load();
      } else {
        execAsync(["bash", "-c", `clipvault get ${id} | wl-copy &`]);
        this.hide();
      }
    } catch (e) {
      console.error("Failed to process clipboard entry:", e);
    }
  }

  show() {
    console.log("Showing clipboard window...");
    this.isVisible = true;
    if (this.window) this.window.visible = true;
    // Always refresh clipboard entries when showing the window
    this.load().catch(console.error);
    return Promise.resolve();
  }

  hide() {
    this.isVisible = false;
    this.mode = "select";
    this.query = "";
    this.index = 0;
    if (this.window) this.window.visible = false;
  }

  toggleMode() {
    this.mode = this.mode === "select" ? "delete" : "select";
    // Force immediate UI update
    setTimeout(() => this.triggerUpdate(), 0);
  }

  up() {
    if (this.filtered.length > 0) {
      this.index = Math.max(0, this.index - 1);
      this.triggerUpdate();
    }
  }

  down() {
    if (this.filtered.length > 0) {
      this.index = Math.min(this.filtered.length - 1, this.index + 1);
      this.triggerUpdate();
    }
  }

  key(k: number) {
    switch (k) {
      case 65307: this.hide(); break;
      case 65293: this.select(); break;
      case 65362: this.up(); break;
      case 65364: this.down(); break;
      case 65289: this.toggleMode(); break;
      case 65535:
        if (this.mode === "select") {
          this.mode = "delete";
          setTimeout(() => this.triggerUpdate(), 0);
        }
        break;
      default:
        if (this.focusSearch) this.focusSearch();
        break;
    }
  }

  search(q: string) {
    this.query = q;
    this.filter();
  }

  clearSearch() {
    this.query = "";
    this.index = 0;
    this.filter();
  }
}

export const clipboard = new ClipboardManager();