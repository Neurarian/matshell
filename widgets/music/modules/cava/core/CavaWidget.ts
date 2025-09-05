import { Accessor } from "ags";
import { Gtk, Gdk } from "ags/gtk4";
import Cava from "gi://AstalCava";
import GObject from "gi://GObject";

import { CavaStyle, getStyleEnum } from "./CavaStyle";

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
    // GTK4 widget methods are provided at runtime by GObject system. Ignore TS complaints.
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
  },
);

export function CavaDraw(props: {
  style?: CavaStyle | string | Accessor<string>;
  hexpand?: boolean;
  vexpand?: boolean;
}) {
  const cavaWidget = new CavaWidget();

  cavaWidget.set_hexpand(props.hexpand ?? false);
  cavaWidget.set_vexpand(props.vexpand ?? false);

  // Handle style prop with proper gnim accessor support
  if (props.style !== undefined) {
    if (typeof props.style === "string" || typeof props.style === "number") {
      cavaWidget.style = getStyleEnum(props.style);
    } else if (
      props.style !== null &&
      "get" in props.style &&
      "subscribe" in props.style
    ) {
      const accessor = props.style as Accessor<string>;

      const initialValue = accessor.get();
      cavaWidget.style = getStyleEnum(initialValue);

      const unsubscribe = accessor.subscribe(() => {
        const newValue = accessor.get();
        cavaWidget.style = getStyleEnum(newValue);
      });

      (cavaWidget as any)._unsubscribeStyle = unsubscribe;

      const originalDispose = cavaWidget.vfunc_dispose.bind(cavaWidget);
      cavaWidget.vfunc_dispose = function () {
        if ((this as any)._unsubscribeStyle) {
          (this as any)._unsubscribeStyle();
          (this as any)._unsubscribeStyle = null;
        }
        originalDispose.call(this);
      };
    }
  }

  return cavaWidget;
}
