import { Gtk, Gdk } from "ags/gtk4";
import Cava from "gi://AstalCava";
import GObject, { register, setter, getter } from "ags/gobject";
import { Accessor, jsx } from "ags";
import { CavaStyle, getStyleEnum } from "./CavaStyle";

import {
  drawCatmullRom,
  drawSmooth,
  drawBars,
  drawDots,
  drawCircular,
  drawMesh,
  drawJumpingBars,
  drawParticles,
  drawWaveParticles,
  drawWaterfall,
} from "../visualizers";

import {
  createJumpingBarsState,
  JumpingBarsState,
  createParticleState,
  ParticleState,
  createWaterfallState,
  WaterfallState,
} from "../utils";

const CavaStyleSpec = (name: string, flags: GObject.ParamFlags) =>
  GObject.ParamSpec.int(
    name,
    "Style",
    "Visualization style",
    flags,
    CavaStyle.SMOOTH,
    CavaStyle.MESH,
    CavaStyle.CATMULL_ROM,
  );

@register({ GTypeName: "Cava" })
export class CavaWidget extends Gtk.Widget {
  static {
    Gtk.Widget.set_css_name.call(this, "cava");
  }

  // Private storage for the style value
  #style = CavaStyle.CATMULL_ROM;

  private cava = Cava.get_default()!;
  private particleState: ParticleState = createParticleState();
  private waterfallState: WaterfallState = createWaterfallState();
  private jumpingBarsState: JumpingBarsState = createJumpingBarsState();

  constructor(params?: any) {
    const { style, ...gtkParams } = params || {};

    super(gtkParams);

    this.cava.connect("notify::values", () => {
      this.queue_draw();
    });

    this.connect("notify::style", () => {
      this.queue_draw();
    });

    if (style !== undefined) {
      this.style = style;
    }
  }

  @getter(CavaStyleSpec)
  get style(): CavaStyle {
    return this.#style;
  }

  @setter(CavaStyleSpec)
  set style(value: CavaStyle | string | number) {
    // Convert string/number to enum
    const enumValue =
      typeof value === "string" || typeof value === "number"
        ? getStyleEnum(value)
        : value;

    if (this.#style !== enumValue) {
      this.#style = enumValue;
      this.notify("style");
    }
  }

  getColor(): Gdk.RGBA {
    const rgba = new Gdk.RGBA();
    rgba.parse("#a6da95");

    const styleContext = this.get_style_context();
    if (styleContext) {
      return styleContext.get_color();
    }

    return rgba;
  }

  vfunc_snapshot(snapshot: Gtk.Snapshot): void {
    super.vfunc_snapshot(snapshot);

    const values = this.cava.get_values();
    const bars = this.cava.get_bars();

    switch (this.#style) {
      case CavaStyle.SMOOTH:
        drawSmooth(this, snapshot, values, bars);
        break;
      case CavaStyle.CATMULL_ROM:
        drawCatmullRom(this, snapshot, values, bars);
        break;
      case CavaStyle.BARS:
        drawBars(this, snapshot, values, bars);
        break;
      case CavaStyle.JUMPING_BARS:
        drawJumpingBars(this, snapshot, values, bars, this.jumpingBarsState);
        break;
      case CavaStyle.DOTS:
        drawDots(this, snapshot, values, bars);
        break;
      case CavaStyle.CIRCULAR:
        drawCircular(this, snapshot, values, bars);
        break;
      case CavaStyle.PARTICLES:
        drawParticles(this, snapshot, values, bars, this.particleState);
        break;
      case CavaStyle.WAVE_PARTICLES:
        drawWaveParticles(this, snapshot, values, bars, this.particleState);
        break;
      case CavaStyle.WATERFALL:
        drawWaterfall(this, snapshot, values, bars, this.waterfallState);
        break;
      case CavaStyle.MESH:
        drawMesh(this, snapshot, values, bars);
        break;
      default:
        drawCatmullRom(this, snapshot, values, bars);
    }
  }

  vfunc_dispose(): void {
    super.vfunc_dispose();
  }
}

export interface CavaDrawProps {
  style?: CavaStyle | string | Accessor<string>;
  hexpand?: boolean;
  vexpand?: boolean;
}

export function CavaDraw({
  style,
  hexpand,
  vexpand,
}: CavaDrawProps): CavaWidget {
  return jsx(CavaWidget, {
    style,
    hexpand,
    vexpand,
  });
}
