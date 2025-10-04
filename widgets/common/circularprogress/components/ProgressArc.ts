import { Gtk, Gdk } from "ags/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { register, property } from "ags/gobject";

@register({ GTypeName: "ProgressArc" })
export class ProgressArcWidget extends Gtk.Widget {
  static {
    Gtk.Widget.set_css_name.call(this, "progress");
  }

  @property(Number) centerX = 0;
  @property(Number) centerY = 0;
  @property(Number) delta = 0;
  @property(Number) lineWidth = 1;
  @property(Number) percentage = 0;
  @property(Number) startAt = 0;
  @property(Number) endAt = 1;
  @property(Boolean) inverted = false;

  private _lineCap: Gsk.LineCap = Gsk.LineCap.BUTT;

  get lineCap(): Gsk.LineCap {
    return this._lineCap;
  }

  set lineCap(value: Gsk.LineCap) {
    this._lineCap = value;
    this.queue_draw();
  }

  updateGeometry(
    centerX: number,
    centerY: number,
    delta: number,
    lineWidth: number,
    lineCap: Gsk.LineCap,
    startAt: number,
    endAt: number,
    inverted: boolean,
    percentage: number,
  ): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.delta = delta;
    this.lineWidth = lineWidth;
    this._lineCap = lineCap;
    this.startAt = startAt;
    this.endAt = endAt;
    this.inverted = inverted;
    this.percentage = percentage;
    this.queue_draw();
  }

  vfunc_snapshot(snapshot: Gtk.Snapshot): void {
    if (this.percentage <= 0) return;

    const color = this.getColor();
    const startAngle = this.startAt * 2 * Math.PI;
    const endAngle = this.endAt * 2 * Math.PI;
    const sweepAngle = endAngle - startAngle;

    const progressAngle = this.inverted
      ? startAngle + this.percentage * sweepAngle
      : startAngle - this.percentage * sweepAngle;

    const pathBuilder = new Gsk.PathBuilder();
    const isCompleteArc = this.shouldDrawFullCircle(sweepAngle);

    if (this.lineWidth <= 0) {
      if (isCompleteArc) {
        this.drawFullCircle(pathBuilder);
      } else {
        this.drawArc(pathBuilder, startAngle, progressAngle, sweepAngle, true);
      }
      snapshot.append_fill(pathBuilder.to_path(), Gsk.FillRule.EVEN_ODD, color);
    } else {
      if (isCompleteArc) {
        this.drawFullCircle(pathBuilder);
      } else {
        this.drawArc(pathBuilder, startAngle, progressAngle, sweepAngle, false);
      }
      const stroke = new Gsk.Stroke(this.lineWidth);
      stroke.set_line_cap(this._lineCap);
      snapshot.append_stroke(pathBuilder.to_path(), stroke, color);
    }
  }

  private shouldDrawFullCircle(sweepAngle: number): boolean {
    const diffAbs = Math.abs(this.endAt - this.startAt);
    const exceedsFullCircle =
      diffAbs > 1 && this.percentage >= 1.0 - (diffAbs - 1);
    return (
      (this.percentage === 1.0 || exceedsFullCircle) &&
      Math.abs(sweepAngle) >= 2 * Math.PI
    );
  }

  private drawFullCircle(pathBuilder: Gsk.PathBuilder): void {
    pathBuilder.add_circle(
      new Graphene.Point({ x: this.centerX, y: this.centerY }),
      this.delta,
    );
  }

  private drawArc(
    pathBuilder: Gsk.PathBuilder,
    startAngle: number,
    progressAngle: number,
    sweepAngle: number,
    asPie: boolean = false,
  ): void {
    const points = this.calculateArcPoints(startAngle, progressAngle);
    const largeArc = Math.abs(this.percentage * sweepAngle) > Math.PI;

    if (asPie) {
      pathBuilder.move_to(this.centerX, this.centerY);
      pathBuilder.line_to(points.startX, points.startY);
    } else {
      pathBuilder.move_to(points.startX, points.startY);
    }

    pathBuilder.svg_arc_to(
      this.delta,
      this.delta,
      0.0,
      largeArc,
      this.inverted,
      points.endX,
      points.endY,
    );

    if (asPie) {
      pathBuilder.line_to(this.centerX, this.centerY);
      pathBuilder.close();
    }
  }

  private calculateArcPoints(
    startAngle: number,
    progressAngle: number,
  ): { startX: number; startY: number; endX: number; endY: number } {
    return {
      startX: this.centerX + this.delta * Math.cos(startAngle),
      startY: this.centerY + this.delta * Math.sin(startAngle),
      endX: this.centerX + this.delta * Math.cos(progressAngle),
      endY: this.centerY + this.delta * Math.sin(progressAngle),
    };
  }

  private getColor(): Gdk.RGBA {
    const rgba = new Gdk.RGBA();
    rgba.parse("#3584e4");
    const styleContext = this.get_style_context();
    return styleContext ? styleContext.get_color() : rgba;
  }
}
