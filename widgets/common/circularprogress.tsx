// Credits to https://github.com/ARKye03

import { Gtk, Gdk } from "ags/gtk4";
import { Accessor } from "ags";
import GObject from "gi://GObject";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";

// ProgressArc widget - handles the main progress arc drawing
const ProgressArcWidget = GObject.registerClass(
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
  class ProgressArcWidget extends Gtk.Widget {
    // GTK4 widget methods are provided at runtime by GObject system. Ignore TS complaints.
    // Private properties
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
      this.connect("notify", () => this.queue_draw());
    }

    // Add a comprehensive geometry update method
    public update_geometry(
      center_x: number,
      center_y: number,
      delta: number,
      line_width: number,
      line_cap: Gsk.LineCap,
      start_at: number,
      end_at: number,
      inverted: boolean,
      percentage: number,
    ): void {
      if (this._updating_geometry) return;

      this._updating_geometry = true;
      this._center_x = center_x;
      this._center_y = center_y;
      this._delta = delta;
      this._line_width = line_width;
      this._line_cap = line_cap;
      this._percentage = percentage;
      this._start_at = start_at;
      this._end_at = end_at;
      this._inverted = inverted;
      this._updating_geometry = false;

      this.queue_draw();
    }
    // Getters and setters for properties
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

// CenterFill widget - handles the center fill
const CenterFillWidget = GObject.registerClass(
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
      this.connect("notify", () => this.queue_draw());
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

const RadiusFillWidget = GObject.registerClass(
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
      this.connect("notify", () => this.queue_draw());
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

const CircularProgressBarWidget = GObject.registerClass(
  {
    CssName: "circularprogress",
    Properties: {
      inverted: GObject.ParamSpec.boolean(
        "inverted",
        "Inverted",
        "Whether the progress bar is inverted",
        GObject.ParamFlags.READWRITE,
        false,
      ),
      center_filled: GObject.ParamSpec.boolean(
        "center_filled",
        "Center Filled",
        "Whether the center of the circle is filled",
        GObject.ParamFlags.READWRITE,
        false,
      ),
      radius_filled: GObject.ParamSpec.boolean(
        "radius_filled",
        "Radius Filled",
        "Whether the radius area is filled",
        GObject.ParamFlags.READWRITE,
        false,
      ),
      line_width: GObject.ParamSpec.int(
        "line_width",
        "Line Width",
        "The width of the circle's radius line",
        GObject.ParamFlags.READWRITE,
        0,
        1000,
        1,
      ),
      line_cap: GObject.ParamSpec.enum(
        "line_cap",
        "Line Cap",
        "The line cap style for the progress stroke",
        GObject.ParamFlags.READWRITE,
        Gsk.LineCap.$gtype,
        Gsk.LineCap.BUTT,
      ),
      fill_rule: GObject.ParamSpec.enum(
        "fill_rule",
        "Fill Rule",
        "The fill rule for the center fill area",
        GObject.ParamFlags.READWRITE,
        Gsk.FillRule.$gtype,
        Gsk.FillRule.EVEN_ODD,
      ),
      percentage: GObject.ParamSpec.double(
        "percentage",
        "Percentage",
        "The progress value between 0.0 and 1.0",
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.0,
      ),
      start_at: GObject.ParamSpec.double(
        "start_at",
        "Start At",
        "The starting position",
        GObject.ParamFlags.READWRITE,
        -1.0,
        1.0,
        0.0,
      ),
      end_at: GObject.ParamSpec.double(
        "end_at",
        "End At",
        "The ending position",
        GObject.ParamFlags.READWRITE,
        -1.0,
        1.0,
        1.0,
      ),
    },
  },
  class CircularProgressBarWidget extends Gtk.Widget {
    private _inverted: boolean = false;
    private _center_filled: boolean = false;
    private _radius_filled: boolean = false;
    private _line_width: number = 1;
    private _line_cap: Gsk.LineCap = Gsk.LineCap.BUTT;
    private _fill_rule: Gsk.FillRule = Gsk.FillRule.EVEN_ODD;
    private _percentage: number = 0.0;
    private _start_at: number = 0.0;
    private _end_at: number = 1.0;
    private _child: Gtk.Widget | null = null;

    // Child widget components
    private _progress_arc: typeof ProgressArcWidget;
    private _center_fill: typeof CenterFillWidget;
    private _radius_fill: typeof RadiusFillWidget;

    constructor() {
      super();

      // Add layout manager and overflow handling
      this.set_layout_manager(new Gtk.BinLayout());
      this.set_overflow(Gtk.Overflow.HIDDEN);

      // Create child widgets
      this._progress_arc = new ProgressArcWidget();
      this._center_fill = new CenterFillWidget();
      this._radius_fill = new RadiusFillWidget();

      // Set parents
      this._progress_arc.set_parent(this);
      this._center_fill.set_parent(this);
      this._radius_fill.set_parent(this);

      this.connect("notify", () => this.queue_draw());
    }

    get inverted(): boolean {
      return this._inverted;
    }
    set inverted(value: boolean) {
      this._inverted = value;
      this._progress_arc.inverted = value;
      this.notify("inverted");
    }

    get center_filled(): boolean {
      return this._center_filled;
    }
    set center_filled(value: boolean) {
      this._center_filled = value;
      this.notify("center_filled");
    }

    get radius_filled(): boolean {
      return this._radius_filled;
    }
    set radius_filled(value: boolean) {
      this._radius_filled = value;
      this.notify("radius_filled");
    }

    get line_width(): number {
      return this._line_width;
    }
    set line_width(value: number) {
      this._line_width = value < 0 ? 0 : value;
      this._progress_arc.line_width = this._line_width;
      this._radius_fill.line_width = this._line_width;
      this.notify("line_width");
    }

    get line_cap(): Gsk.LineCap {
      return this._line_cap;
    }
    set line_cap(value: Gsk.LineCap) {
      this._line_cap = value;
      this._progress_arc.line_cap = value;
      this.notify("line_cap");
    }

    get fill_rule(): Gsk.FillRule {
      return this._fill_rule;
    }
    set fill_rule(value: Gsk.FillRule) {
      this._fill_rule = value;
      this._center_fill.fill_rule = value;
      this.notify("fill_rule");
    }

    get percentage(): number {
      return this._percentage;
    }
    set percentage(value: number) {
      if (this._percentage !== value) {
        if (value > 1.0) {
          this._percentage = 1.0;
        } else if (value < 0.0) {
          this._percentage = 0.0;
        } else {
          this._percentage = value;
        }
        this._progress_arc.percentage = this._percentage;
        this.notify("percentage");
      }
    }

    get start_at(): number {
      return this._start_at;
    }
    set start_at(value: number) {
      if (value < -1.0) {
        this._start_at = -1.0;
      } else if (value > 1.0) {
        this._start_at = 1.0;
      } else {
        this._start_at = value;
      }
      this._progress_arc.start_at = this._start_at;
      this.notify("start_at");
    }

    get end_at(): number {
      return this._end_at;
    }
    set end_at(value: number) {
      if (value < -1.0) {
        this._end_at = -1.0;
      } else if (value > 1.0) {
        this._end_at = 1.0;
      } else {
        this._end_at = value;
      }
      this._progress_arc.end_at = this._end_at;
      this.notify("end_at");
    }

    get child(): Gtk.Widget | null {
      return this._child;
    }
    set child(value: Gtk.Widget | null) {
      if (this._child === value) {
        return;
      }

      if (this._child !== null) {
        this._child.unparent();
      }

      this._child = value;

      if (this._child !== null) {
        this._child.set_parent(this);
      }
    }
    // Add a helper method to update all child geometries at once
    private updateChildGeometries(width: number, height: number): void {
      const radius = Math.min(width / 2.0, height / 2.0) - 1;
      const half_line_width = this._line_width / 2.0;
      let delta = radius - half_line_width;

      if (delta < 0) delta = 0;

      const actual_line_width =
        this._line_width > radius * 2 ? radius * 2 : this._line_width;

      // Update geometries for all child widgets at once
      this._progress_arc.update_geometry(
        width / 2.0,
        height / 2.0,
        delta,
        actual_line_width,
        this._line_cap,
        this._start_at,
        this._end_at,
        this._inverted,
        this._percentage,
      );

      this._center_fill.update_geometry(
        width / 2.0,
        height / 2.0,
        delta,
        this._fill_rule,
      );

      this._radius_fill.update_geometry(
        width / 2.0,
        height / 2.0,
        delta,
        radius,
        actual_line_width,
      );
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const width = this.get_width();
      const height = this.get_height();

      // Update all child geometries before drawing
      this.updateChildGeometries(width, height);

      // Draw in correct order
      if (this._center_filled) {
        this.snapshot_child(this._center_fill, snapshot);
      }

      if (this._radius_filled) {
        this.snapshot_child(this._radius_fill, snapshot);
      }

      this.snapshot_child(this._progress_arc, snapshot);

      if (this._child !== null) {
        this.snapshot_child(this._child, snapshot);
      }
    }

    vfunc_size_allocate(width: number, height: number, baseline: number): void {
      // Allocate sizes to internal widgets first
      const internal_allocation = {
        x: 0,
        y: 0,
        width: width,
        height: height,
      };

      this._progress_arc.size_allocate(internal_allocation, baseline);
      this._center_fill.size_allocate(internal_allocation, baseline);
      this._radius_fill.size_allocate(internal_allocation, baseline);

      // Update geometries after allocation
      this.updateChildGeometries(width, height);

      // Handle child widget if present
      if (this._child !== null) {
        const radius = Math.min(width / 2.0, height / 2.0) - 1;
        const half_line_width = this._line_width / 2.0;
        let delta = radius - half_line_width;
        if (delta < 0) delta = 0;

        const max_child_size = Math.floor(delta * Math.sqrt(2));
        const child_x = Math.floor((width - max_child_size) / 2);
        const child_y = Math.floor((height - max_child_size) / 2);

        this._child.size_allocate(
          {
            x: child_x,
            y: child_y,
            width: max_child_size,
            height: max_child_size,
          },
          baseline,
        );
      }
    }
    vfunc_dispose(): void {
      if (this._child !== null) {
        this._child.unparent();
        this._child = null;
      }

      this._progress_arc.unparent();
      this._center_fill.unparent();
      this._radius_fill.unparent();

      super.vfunc_dispose();
    }

    vfunc_measure(
      orientation: Gtk.Orientation,
      for_size: number,
    ): [number, number, number, number] {
      let min = 0;
      let nat = 0;
      let min_baseline = -1;
      let nat_baseline = -1;

      // Get child's size requirements if it exists
      if (this._child !== null) {
        const [child_min, child_nat, child_min_baseline, child_nat_baseline] =
          this._child.measure(orientation, for_size);

        const padding = this._line_width * 4;
        min = child_min + padding;
        nat = child_nat + padding;
      } else {
        min = nat = 40; // Default minimum size
      }

      return [min, nat, min_baseline, nat_baseline];
    }
  },
);

export function CircularProgressBar(props: {
  percentage?: number | Accessor<number>;
  inverted?: boolean;
  centerFilled?: boolean;
  radiusFilled?: boolean;
  lineWidth?: number;
  lineCap?: Gsk.LineCap;
  fillRule?: Gsk.FillRule;
  startAt?: number;
  endAt?: number;
  child?: Gtk.Widget;
  children?: Gtk.Widget;
}) {
  const widget = new CircularProgressBarWidget();
  // Handle percentage using gnim Accessor API
  if (props.percentage !== undefined) {
    if (
      props.percentage !== null &&
      "get" in props.percentage &&
      "subscribe" in props.percentage
    ) {
      const accessor = props.percentage as Accessor<number>;

      const unsubscribe = accessor.subscribe(() => {
        const newValue = accessor.get();
        widget.percentage = typeof newValue === "number" ? newValue : 0;
      });

      (widget as any)._unsubscribePercentage = unsubscribe;

      const originalDispose = widget.vfunc_dispose.bind(widget);
      widget.vfunc_dispose = function () {
        if ((this as any)._unsubscribePercentage) {
          (this as any)._unsubscribePercentage();
          (this as any)._unsubscribePercentage = null;
        }
        originalDispose.call(this);
      };
    } else if (typeof props.percentage === "number") {
      widget.percentage = props.percentage;
    }
  }

  if (props.inverted !== undefined) widget.inverted = props.inverted;
  if (props.centerFilled !== undefined)
    widget.center_filled = props.centerFilled;
  if (props.radiusFilled !== undefined)
    widget.radius_filled = props.radiusFilled;
  if (props.lineWidth !== undefined) widget.line_width = props.lineWidth;
  if (props.lineCap !== undefined) widget.line_cap = props.lineCap;
  if (props.fillRule !== undefined) widget.fill_rule = props.fillRule;
  if (props.startAt !== undefined) widget.start_at = props.startAt;
  if (props.endAt !== undefined) widget.end_at = props.endAt;
  if (props.child !== undefined) widget.child = props.child;
  if (props.children !== undefined) widget.child = props.children;

  return widget;
}
