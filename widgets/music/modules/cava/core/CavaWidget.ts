import { Gtk, Gdk } from "ags/gtk4";
import Cava from "gi://AstalCava";
import GObject from "gi://GObject";

import { CavaStyle, getStyleEnum, styleMap } from "./CavaStyle";

import {
  // Simple visualizers
  drawCatmullRom,
  drawSmooth,
  drawBars,
  drawDots,
  drawCircular,
  drawMesh,

  // Stateful visualizers
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

export const CavaWidget = GObject.registerClass(
  {
    CssName: "cava",
    Properties: {
      style: GObject.ParamSpec.int(
        "style",
        "Style",
        "Visualization style",
        GObject.ParamFlags.READWRITE,
        CavaStyle.SMOOTH,
        CavaStyle.MESH,
        CavaStyle.CATMULL_ROM,
      ),
    },
  },
  class CavaWidget extends Gtk.Widget {
    public cava = Cava.get_default()!;
    private _style: CavaStyle = CavaStyle.CATMULL_ROM;

    // Initialize state for stateful visualizers
    private particleState: ParticleState = createParticleState();
    private waterfallState: WaterfallState = createWaterfallState();
    private jumpingBarsState: JumpingBarsState = createJumpingBarsState();

    constructor() {
      super();
      this.cava.connect("notify::values", () => {
        this.queue_draw();
      });
    }

    get style(): CavaStyle {
      return this._style;
    }

    set style(val: CavaStyle) {
      this._style = val;
      this.queue_draw();
    }

    // Get the color from the widget's style context
    get_color(): Gdk.RGBA {
      const rgba = new Gdk.RGBA();
      rgba.parse("#a6da95"); // Default fallback color

      const styleContext = this.get_style_context();
      if (styleContext) {
        return styleContext.get_color();
      }

      return rgba;
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot) {
      super.vfunc_snapshot(snapshot);

      const values = this.cava.get_values();
      const bars = this.cava.get_bars();

      // Choose drawing style based on the style property
      switch (this.style) {
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

    // Set style from binding (for use with reactive properties)
    set_style_from_binding(binding: any) {
      if (
        typeof binding === "object" &&
        "subscribe" in binding &&
        "get" in binding
      ) {
        // Handle it as a binding object
        const updateStyle = () => {
          this._style = getStyleEnum(binding.get());
          this.queue_draw();
        };

        // Init
        updateStyle();

        // Subscribe to changes
        return binding.subscribe(updateStyle);
      }
    }
  },
);

export function CavaDraw(props: {
  style?: CavaStyle | string | { subscribe: Function; get: Function };
  hexpand?: boolean;
  vexpand?: boolean;
}) {
  const cavaWidget = new CavaWidget();

  cavaWidget.set_hexpand(props.hexpand ?? false);
  cavaWidget.set_vexpand(props.vexpand ?? false);

  if (props.style !== undefined) {
    if (typeof props.style === "string" || typeof props.style === "number") {
      cavaWidget.style = getStyleEnum(props.style);
    } else {
      // Handle binding object
      cavaWidget.set_style_from_binding(props.style);
    }
  }

  return cavaWidget;
}
