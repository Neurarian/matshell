import GObject, { register, getter, setter } from "ags/gobject";
import { monitorFile, readFileAsync } from "ags/file";
import { exec, execAsync } from "ags/process";
import { onCleanup } from "ags";

const get = (args: string) => Number(exec(`brightnessctl ${args}`));
const screen = exec(`bash -c "ls -w1 /sys/class/backlight | head -1"`);
const kbd = exec(`bash -c "ls -w1 /sys/class/leds | head -1"`);

@register({ GTypeName: "Brightness" })
export default class Brightness extends GObject.Object {
  // @ts-ignore - notify method is provided by GObject at runtime
  notify(property: string): void;
  static instance: Brightness;
  static get_default() {
    if (!this.instance) this.instance = new Brightness();
    return this.instance;
  }

  #hasBacklight = false;
  #kbdMax = 0;
  #kbd = 0;
  #screenMax = 0;
  #screen = 0;
  #screenMonitor: any = null;
  #kbdMonitor: any = null;
  #settingScreen = false;
  #settingKbd = false;

  constructor() {
    super();
    this.initializeHardware();
  }

  private initializeHardware(): void {
    this.#hasBacklight = exec(`bash -c "ls /sys/class/backlight"`).length > 0;
    if (!this.#hasBacklight) return;

    try {
      this.#kbdMax = get(`--device ${kbd} max`);
      this.#kbd = get(`--device ${kbd} get`);
      this.#screenMax = get("max");
      this.#screen = get("get") / this.#screenMax;

      this.#screenMonitor = monitorFile(
        `/sys/class/backlight/${screen}/brightness`,
        async (f) => {
          if (this.#settingScreen) return;

          try {
            const v = await readFileAsync(f);
            const newValue = Number(v) / this.#screenMax;
            if (Math.abs(this.#screen - newValue) > 0.001) {
              this.#screen = newValue;
              this.notify("screen");
            }
          } catch (error) {
            console.error("Error reading screen brightness:", error);
          }
        },
      );

      this.#kbdMonitor = monitorFile(
        `/sys/class/leds/${kbd}/brightness`,
        async (f) => {
          if (this.#settingKbd) return;

          try {
            const v = await readFileAsync(f);
            const newValue = Number(v);
            if (this.#kbd !== newValue) {
              this.#kbd = newValue;
              this.notify("kbd");
            }
          } catch (error) {
            console.error("Error reading keyboard brightness:", error);
          }
        },
      );

      onCleanup(() => {
        this.#screenMonitor?.cancel?.();
        this.#kbdMonitor?.cancel?.();
      });
    } catch (error) {
      console.error("Error initializing brightness controls:", error);
      this.#hasBacklight = false;
    }
  }

  @getter(Boolean)
  get hasBacklight(): boolean {
    return this.#hasBacklight;
  }

  @getter(Number)
  get kbd(): number {
    return this.#kbd;
  }

  @setter(Number)
  set kbd(value: number) {
    if (!this.#hasBacklight || value < 0 || value > this.#kbdMax) return;

    this.#settingKbd = true;
    execAsync(`brightnessctl -d ${kbd} s ${value} -q`)
      .then(() => {
        setTimeout(() => (this.#settingKbd = false), 100);
      })
      .catch((error) => {
        console.error("Error setting keyboard brightness:", error);
        this.#settingKbd = false;
      });
  }

  @getter(Number)
  get screen(): number {
    return this.#screen;
  }

  @setter(Number)
  set screen(percent: number) {
    if (!this.#hasBacklight) return;

    percent = Math.max(0.01, Math.min(1, percent)); // Minimum 1% to avoid complete darkness

    this.#screen = percent;
    this.notify("screen");

    this.#settingScreen = true;
    execAsync(`brightnessctl -d ${screen} set ${Math.floor(percent * 100)}% -q`)
      .then(() => {
        setTimeout(() => (this.#settingScreen = false), 200);
      })
      .catch((error) => {
        console.error("Error setting screen brightness:", error);
        this.#screen = get("get") / this.#screenMax;
        this.notify("screen");
        this.#settingScreen = false;
      });
  }

  dispose() {
    if (this.#screenMonitor) {
      this.#screenMonitor.cancel?.();
      this.#screenMonitor = null;
    }
    if (this.#kbdMonitor) {
      this.#kbdMonitor.cancel?.();
      this.#kbdMonitor = null;
    }
    super.dispose?.();
  }
}
