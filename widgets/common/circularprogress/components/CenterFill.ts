import { Gtk, Gdk } from "ags/gtk4";
import GObject from "gi://GObject";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";

// CenterFill widget - handles the center fill
export const CenterFillWidget = GObject.registerClass(
  {
    CssName: "center",
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
      fill_rule: GObject.ParamSpec.enum(
        "fill_rule",
        "Fill Rule",
        "Fill rule to use",
        GObject.ParamFlags.READWRITE,
        Gsk.FillRule.$gtype,
        Gsk.FillRule.EVEN_ODD,
      ),
    },
  },
  class CenterFillWidget extends Gtk.Widget {
    private _center_x: number = 0;
    private _center_y: number = 0;
    private _delta: number = 0;
    private _fill_rule: Gsk.FillRule = Gsk.FillRule.EVEN_ODD;
    private _updating_geometry: boolean = false;

    constructor() {
      super();
    }

    public update_geometry(
      center_x: number,
      center_y: number,
      delta: number,
      fill_rule: Gsk.FillRule,
    ): void {
      if (this._updating_geometry) return;

      this._updating_geometry = true;
      this._center_x = center_x;
      this._center_y = center_y;
      this._delta = delta;
      this._fill_rule = fill_rule;
      this._updating_geometry = false;

      this.queue_draw();
    }

    // Getters and setters
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

    get fill_rule(): Gsk.FillRule {
      return this._fill_rule;
    }
    set fill_rule(value: Gsk.FillRule) {
      this._fill_rule = value;
      this.notify("fill_rule");
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const color = this.get_color();
      const path_builder = new Gsk.PathBuilder();

      path_builder.add_circle(
        new Graphene.Point({ x: this._center_x, y: this._center_y }),
        this._delta,
      );

      snapshot.append_fill(path_builder.to_path(), this._fill_rule, color);
    }

    private get_color(): Gdk.RGBA {
      const rgba = new Gdk.RGBA();
      rgba.parse("#3584e4"); // Default color with some transparency

      const styleContext = this.get_style_context();
      if (styleContext) {
        return styleContext.get_color();
      }
      return rgba;
    }
  },
);
