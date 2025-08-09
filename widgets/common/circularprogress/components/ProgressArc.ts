import { Gtk, Gdk } from "ags/gtk4";
import GObject from "gi://GObject";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { ProgressArcGeometry } from "../types.ts";

// ProgressArc widget - handles the main progress arc drawing
export const ProgressArcWidget = GObject.registerClass(
  {
    CssName: "progress",
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
        "Radius of the arc",
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
      line_cap: GObject.ParamSpec.enum(
        "line_cap",
        "Line Cap",
        "Line cap style",
        GObject.ParamFlags.READWRITE,
        Gsk.LineCap.$gtype,
        Gsk.LineCap.BUTT,
      ),
      percentage: GObject.ParamSpec.double(
        "percentage",
        "Percentage",
        "Progress percentage",
        GObject.ParamFlags.READWRITE,
        0,
        1,
        0,
      ),
      start_at: GObject.ParamSpec.double(
        "start_at",
        "Start At",
        "Start angle",
        GObject.ParamFlags.READWRITE,
        -1,
        1,
        0,
      ),
      end_at: GObject.ParamSpec.double(
        "end_at",
        "End At",
        "End angle",
        GObject.ParamFlags.READWRITE,
        -1,
        1,
        1,
      ),
      inverted: GObject.ParamSpec.boolean(
        "inverted",
        "Inverted",
        "Whether progress is inverted",
        GObject.ParamFlags.READWRITE,
        false,
      ),
    },
  },
  // GTK4 widget methods are provided at runtime by GObject system. Ignore TS complaints.
  class ProgressArcWidget extends Gtk.Widget {
    private _center_x: number = 0;
    private _center_y: number = 0;
    private _delta: number = 0;
    private _line_width: number = 1;
    private _line_cap: Gsk.LineCap = Gsk.LineCap.BUTT;
    private _percentage: number = 0;
    private _start_at: number = 0;
    private _end_at: number = 1;
    private _inverted: boolean = false;
    private _updating_geometry: boolean = false;

    constructor() {
      super();
    }

    public redraw(): void {
      this.queue_draw();
    }

    public update_geometry(geometry: ProgressArcGeometry): void {
      if (this._updating_geometry) return;

      this._updating_geometry = true;
      Object.assign(this, {
        _center_x: geometry.center_x,
        _center_y: geometry.center_y,
        _delta: geometry.delta,
        _line_width: geometry.line_width,
        _line_cap: geometry.line_cap,
        _percentage: geometry.percentage,
        _start_at: geometry.start_at,
        _end_at: geometry.end_at,
        _inverted: geometry.inverted,
      });
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

    get line_cap(): Gsk.LineCap {
      return this._line_cap;
    }
    set line_cap(value: Gsk.LineCap) {
      this._line_cap = value;
      this.notify("line_cap");
    }

    get percentage(): number {
      return this._percentage;
    }
    set percentage(value: number) {
      this._percentage = value;
      this.notify("percentage");
      this.redraw();
    }

    get start_at(): number {
      return this._start_at;
    }
    set start_at(value: number) {
      this._start_at = value;
      this.notify("start_at");
    }

    get end_at(): number {
      return this._end_at;
    }
    set end_at(value: number) {
      this._end_at = value;
      this.notify("end_at");
    }

    get inverted(): boolean {
      return this._inverted;
    }
    set inverted(value: boolean) {
      this._inverted = value;
      this.notify("inverted");
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      if (this._percentage <= 0) return;

      const color = this.get_color();
      const start_angle = this._start_at * 2 * Math.PI;
      const end_angle = this._end_at * 2 * Math.PI;
      const sweep_angle = end_angle - start_angle;

      const progress_angle = this._inverted
        ? start_angle + this._percentage * sweep_angle
        : start_angle - this._percentage * sweep_angle;

      const path_builder = new Gsk.PathBuilder();

      const is_complete_arc = this.should_draw_full_circle(sweep_angle);

      // Draw as pie or arc based on line width
      if (this._line_width <= 0) {
        if (is_complete_arc) {
          this.draw_full_circle(path_builder);
        } else {
          this.draw_arc(
            path_builder,
            start_angle,
            progress_angle,
            sweep_angle,
            true,
          );
        }
        snapshot.append_fill(
          path_builder.to_path(),
          Gsk.FillRule.EVEN_ODD,
          color,
        );
      } else {
        if (is_complete_arc) {
          this.draw_full_circle(path_builder);
        } else {
          this.draw_arc(
            path_builder,
            start_angle,
            progress_angle,
            sweep_angle,
            false,
          );
        }
        const stroke = new Gsk.Stroke(this._line_width);
        stroke.set_line_cap(this._line_cap);
        snapshot.append_stroke(path_builder.to_path(), stroke, color);
      }
    }

    // Helper methods
    private should_draw_full_circle(sweep_angle: number): boolean {
      const diff_abs = Math.abs(this._end_at - this._start_at);
      const exceeds_full_circle =
        diff_abs > 1 && this._percentage >= 1.0 - (diff_abs - 1);

      return (
        (this._percentage == 1.0 || exceeds_full_circle) &&
        Math.abs(sweep_angle) >= 2 * Math.PI
      );
    }

    private draw_full_circle(path_builder: Gsk.PathBuilder): void {
      path_builder.add_circle(
        new Graphene.Point({ x: this._center_x, y: this._center_y }),
        this._delta,
      );
    }

    private draw_arc(
      path_builder: Gsk.PathBuilder,
      start_angle: number,
      progress_angle: number,
      sweep_angle: number,
      as_pie: boolean = false,
    ): void {
      const points = this.calculate_arc_points(start_angle, progress_angle);
      const large_arc = Math.abs(this._percentage * sweep_angle) > Math.PI;

      if (as_pie) {
        path_builder.move_to(this._center_x, this._center_y);
        path_builder.line_to(points.start_x, points.start_y);
      } else {
        path_builder.move_to(points.start_x, points.start_y);
      }

      path_builder.svg_arc_to(
        this._delta,
        this._delta,
        0.0,
        large_arc,
        this._inverted,
        points.end_x,
        points.end_y,
      );

      if (as_pie) {
        path_builder.line_to(this._center_x, this._center_y);
        path_builder.close();
      }
    }

    private calculate_arc_points(
      start_angle: number,
      progress_angle: number,
    ): { start_x: number; start_y: number; end_x: number; end_y: number } {
      return {
        start_x: this._center_x + this._delta * Math.cos(start_angle),
        start_y: this._center_y + this._delta * Math.sin(start_angle),
        end_x: this._center_x + this._delta * Math.cos(progress_angle),
        end_y: this._center_y + this._delta * Math.sin(progress_angle),
      };
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
