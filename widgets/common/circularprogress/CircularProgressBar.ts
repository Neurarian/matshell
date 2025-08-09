import { Gtk } from "ags/gtk4";
import Gsk from "gi://Gsk";
import GObject from "gi://GObject";
import { ProgressArcWidget } from "./components/ProgressArc.ts";
import { CenterFillWidget } from "./components/CenterFill.ts";
import { RadiusFillWidget } from "./components/RadiusFill.ts";
import { ProgressArcGeometry, GeometryUpdate } from "./types.ts";

export const CircularProgressBarWidget = GObject.registerClass(
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

    private _progress_arc: typeof ProgressArcWidget;
    private _center_fill: typeof CenterFillWidget;
    private _radius_fill: typeof RadiusFillWidget;

    constructor() {
      super();

      this.initializeComponents();

      this.connect("unmap", () => {
        this.dispose();
      });
    }

    private initializeComponents(): void {
      this.set_layout_manager(new Gtk.BinLayout());
      this.set_overflow(Gtk.Overflow.HIDDEN);

      this._progress_arc = new ProgressArcWidget();
      this._center_fill = new CenterFillWidget();
      this._radius_fill = new RadiusFillWidget();

      this._progress_arc.set_parent(this);
      this._center_fill.set_parent(this);
      this._radius_fill.set_parent(this);
    }

    public dispose(): void {
      [this._progress_arc, this._center_fill, this._radius_fill, this._child]
        .filter(Boolean)
        .forEach((widget) => widget.unparent());
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

    // Add a helper method to update all child geometries at once
    private updateChildGeometries(width: number, height: number): void {
      const radius = Math.min(width / 2.0, height / 2.0) - 1;
      const half_line_width = this._line_width / 2.0;
      let delta = radius - half_line_width;

      if (delta < 0) delta = 0;

      const actual_line_width =
        this._line_width > radius * 2 ? radius * 2 : this._line_width;

      const arcGeometry: ProgressArcGeometry = {
        center_x: width / 2.0,
        center_y: height / 2.0,
        delta: delta,
        line_width: actual_line_width,
        line_cap: this._line_cap,
        start_at: this._start_at,
        end_at: this._end_at,
        inverted: this._inverted,
        percentage: this._percentage,
      };

      const centerGeometry: GeometryUpdate = {
        center_x: width / 2.0,
        center_y: height / 2.0,
        delta: delta,
      };

      const radiusGeometry: GeometryUpdate & { line_width: number } = {
        center_x: width / 2.0,
        center_y: height / 2.0,
        delta: delta,
        line_width: actual_line_width,
      };

      this._progress_arc.update_geometry(arcGeometry);
      this._center_fill.update_geometry(
        centerGeometry.center_x,
        centerGeometry.center_y,
        centerGeometry.delta,
        this._fill_rule,
      );
      this._radius_fill.update_geometry(
        radiusGeometry.center_x,
        radiusGeometry.center_y,
        radiusGeometry.delta,
        radius,
        radiusGeometry.line_width,
      );
    }
  },
);
