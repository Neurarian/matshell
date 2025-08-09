import { Gtk, Gdk } from "ags/gtk4";
import GObject from "gi://GObject";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { DisposableWidget } from "../types.ts";

export const RadiusFillWidget = GObject.registerClass(
  {
    CssName: "radius",
    Properties: {
      center_x: GObject.ParamSpec.double(
        "center_x",
        "Center X",
        "X coordinate of the center",
        GObject.ParamFlags.READWRITE,
        0,
        10000,
        0,
      ),
      center_y: GObject.ParamSpec.double(
        "center_y",
        "Center Y",
        "Y coordinate of the center",
        GObject.ParamFlags.READWRITE,
        0,
        10000,
        0,
      ),
      delta: GObject.ParamSpec.double(
        "delta",
        "Delta",
        "Radius",
        GObject.ParamFlags.READWRITE,
        0,
        10000,
        0,
      ),
      line_width: GObject.ParamSpec.double(
        "line_width",
        "Line Width",
        "Width of the line",
        GObject.ParamFlags.READWRITE,
        0,
        1000,
        1,
      ),
    },
  },
  class RadiusFillWidget extends Gtk.Widget {
    private _center_x: number = 0;
    private _center_y: number = 0;
    private _delta: number = 0;
    private _line_width: number = 1;
    private _updating_geometry: boolean = false;

    constructor() {
      super();
    }
    public update_geometry(
      center_x: number,
      center_y: number,
      delta: number,
      radius: number,
      line_width: number,
    ): void {
      if (this._updating_geometry) return;

      this._updating_geometry = true;
      this._center_x = center_x;
      this._center_y = center_y;
      this._delta = delta;
      this._line_width = line_width;
      this._updating_geometry = false;

      this.queue_draw();
    }

    get center_x(): number {
      return this._center_x;
    }
    set center_x(value: number) {
      this._center_x = value;
      this.notify("center_x");
    }

    get center_y(): number {
      return this._center_y;
    }
    set center_y(value: number) {
      this._center_y = value;
      this.notify("center_y");
    }

    get delta(): number {
      return this._delta;
    }
    set delta(value: number) {
      this._delta = value;
      this.notify("delta");
    }

    get line_width(): number {
      return this._line_width;
    }
    set line_width(value: number) {
      this._line_width = value;
      this.notify("line_width");
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const color = this.get_color();
      const path_builder = new Gsk.PathBuilder();

      path_builder.add_circle(
        new Graphene.Point({ x: this._center_x, y: this._center_y }),
        this._delta,
      );

      if (this._line_width <= 0) {
        snapshot.append_fill(
          path_builder.to_path(),
          Gsk.FillRule.EVEN_ODD,
          color,
        );
      } else {
        const stroke = new Gsk.Stroke(this._line_width);
        snapshot.append_stroke(path_builder.to_path(), stroke, color);
      }
    }

    private get_color(): Gdk.RGBA {
      const rgba = new Gdk.RGBA();
      rgba.parse("#3584e4"); // Default color

      const styleContext = this.get_style_context();
      if (styleContext) {
        return styleContext.get_color();
      }
      return rgba;
    }
  },
);
