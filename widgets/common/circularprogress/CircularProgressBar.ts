import { Gtk, Gdk } from "ags/gtk4";
import Gsk from "gi://Gsk";
import GObject, { register, property } from "ags/gobject";
import { ProgressArcWidget } from "./components/ProgressArc.ts";
import { CenterFillWidget } from "./components/CenterFill.ts";
import { RadiusFillWidget } from "./components/RadiusFill.ts";

const LineCapSpec = (name: string, flags: GObject.ParamFlags) =>
  GObject.ParamSpec.enum(
    name,
    "Line Cap",
    "Line cap style",
    flags,
    Gsk.LineCap.$gtype,
    Gsk.LineCap.BUTT,
  );

const FillRuleSpec = (name: string, flags: GObject.ParamFlags) =>
  GObject.ParamSpec.enum(
    name,
    "Fill Rule",
    "Fill rule to use",
    flags,
    Gsk.FillRule.$gtype,
    Gsk.FillRule.EVEN_ODD,
  );

@register({
  GTypeName: "CircularProgressBar",
})
export class CircularProgressBarWidget extends Gtk.Widget {
  static {
    Gtk.Widget.set_css_name.call(this, "circularprogress");
  }

  @property(Boolean) inverted = false;
  @property(Boolean) centerFilled = false;
  @property(Boolean) radiusFilled = false;
  @property(Number) lineWidth = 1;
  @property(Number) percentage = 0.0;
  @property(Number) startAt = 0.0;
  @property(Number) endAt = 1.0;
  @property(LineCapSpec) lineCap = Gsk.LineCap.BUTT;
  @property(FillRuleSpec) fillRule = Gsk.FillRule.EVEN_ODD;

  private _child: Gtk.Widget | null = null;
  private _progressArc!: ProgressArcWidget;
  private _centerFill!: CenterFillWidget;
  private _radiusFill!: RadiusFillWidget;

  constructor(params?: any) {
    const {
      percentage,
      inverted,
      centerFilled,
      radiusFilled,
      lineWidth,
      startAt,
      endAt,
      lineCap,
      fillRule,
      ...gtkParams
    } = params || {};

    super(gtkParams);

    this.set_layout_manager(new Gtk.BinLayout());
    this.set_overflow(Gtk.Overflow.HIDDEN);

    this._progressArc = new ProgressArcWidget();
    this._centerFill = new CenterFillWidget();
    this._radiusFill = new RadiusFillWidget();

    this._progressArc.set_parent(this);
    this._centerFill.set_parent(this);
    this._radiusFill.set_parent(this);

    // Set up reactivity
    this.connect("notify::percentage", () => this.queue_draw());

    // Apply constructor parameters to properties
    if (inverted !== undefined) this.inverted = inverted;
    if (centerFilled !== undefined) this.centerFilled = centerFilled;
    if (radiusFilled !== undefined) this.radiusFilled = radiusFilled;
    if (lineWidth !== undefined) this.lineWidth = lineWidth;
    if (startAt !== undefined) this.startAt = startAt;
    if (endAt !== undefined) this.endAt = endAt;
    if (lineCap !== undefined) this.lineCap = lineCap;
    if (fillRule !== undefined) this.fillRule = fillRule;
    if (percentage !== undefined && typeof percentage === "number") {
      this.percentage = percentage;
    }
  }


  vfunc_dispose(): void {
    this._progressArc?.unparent();
    this._centerFill?.unparent();
    this._radiusFill?.unparent();
    this._child?.unparent();

    super.vfunc_dispose();
  }

  get child(): Gtk.Widget | null {
    return this._child;
  }

  set child(value: Gtk.Widget | null) {
    if (this._child === value) return;

    this._child?.unparent();
    this._child = value;
    this._child?.set_parent(this);
  }

  vfunc_snapshot(snapshot: Gtk.Snapshot): void {
    const width = this.get_width();
    const height = this.get_height();

    this.updateChildGeometries(width, height);

    if (this.centerFilled) {
      this.snapshot_child(this._centerFill, snapshot);
    }

    if (this.radiusFilled) {
      this.snapshot_child(this._radiusFill, snapshot);
    }

    this.snapshot_child(this._progressArc, snapshot);

    if (this._child) {
      this.snapshot_child(this._child, snapshot);
    }
  }

  vfunc_size_allocate(width: number, height: number, baseline: number): void {
    const allocation = new Gdk.Rectangle();
    allocation.x = 0;
    allocation.y = 0;
    allocation.width = width;
    allocation.height = height;

    this._progressArc.size_allocate(allocation, baseline);
    this._centerFill.size_allocate(allocation, baseline);
    this._radiusFill.size_allocate(allocation, baseline);

    this.updateChildGeometries(width, height);

    if (this._child) {
      const radius = Math.min(width / 2.0, height / 2.0) - 1;
      const halfLineWidth = this.lineWidth / 2.0;
      const delta = Math.max(0, radius - halfLineWidth);
      const maxChildSize = Math.floor(delta * Math.sqrt(2));

      const childAllocation = new Gdk.Rectangle();
      childAllocation.x = Math.floor((width - maxChildSize) / 2);
      childAllocation.y = Math.floor((height - maxChildSize) / 2);
      childAllocation.width = maxChildSize;
      childAllocation.height = maxChildSize;

      this._child.size_allocate(childAllocation, baseline);
    }
  }

  vfunc_measure(
    orientation: Gtk.Orientation,
    for_size: number,
  ): [number, number, number, number] {
    if (this._child) {
      const [childMin, childNat] = this._child.measure(orientation, for_size);
      const padding = this.lineWidth * 4;
      return [childMin + padding, childNat + padding, -1, -1];
    }

    return [40, 40, -1, -1];
  }

  private updateChildGeometries(width: number, height: number): void {
    const radius = Math.min(width / 2.0, height / 2.0) - 1;
    const halfLineWidth = this.lineWidth / 2.0;
    const delta = Math.max(0, radius - halfLineWidth);
    const actualLineWidth = Math.min(this.lineWidth, radius * 2);

    this._progressArc.updateGeometry(
      width / 2.0,
      height / 2.0,
      delta,
      actualLineWidth,
      this.lineCap,
      this.startAt,
      this.endAt,
      this.inverted,
      this.percentage,
    );

    this._centerFill.updateGeometry(
      width / 2.0,
      height / 2.0,
      delta,
      this.fillRule,
    );

    this._radiusFill.updateGeometry(
      width / 2.0,
      height / 2.0,
      delta,
      actualLineWidth,
    );
  }
}
