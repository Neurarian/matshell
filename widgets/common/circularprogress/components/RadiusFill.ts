import { Gtk, Gdk } from "ags/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { register, property } from "ags/gobject";

@register({ GTypeName: "RadiusFill" })
export class RadiusFillWidget extends Gtk.Widget {
  static {
    Gtk.Widget.set_css_name.call(this, "radius");
  }

  @property(Number) centerX = 0;
  @property(Number) centerY = 0;
  @property(Number) delta = 0;
  @property(Number) lineWidth = 1;

  updateGeometry(
    centerX: number,
    centerY: number,
    delta: number,
    lineWidth: number,
  ): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.delta = delta;
    this.lineWidth = lineWidth;
    this.queue_draw();
  }

  vfunc_snapshot(snapshot: Gtk.Snapshot): void {
    const color = this.getColor();
    const pathBuilder = new Gsk.PathBuilder();

    pathBuilder.add_circle(
      new Graphene.Point({ x: this.centerX, y: this.centerY }),
      this.delta,
    );

    if (this.lineWidth <= 0) {
      snapshot.append_fill(pathBuilder.to_path(), Gsk.FillRule.EVEN_ODD, color);
    } else {
      const stroke = new Gsk.Stroke(this.lineWidth);
      snapshot.append_stroke(pathBuilder.to_path(), stroke, color);
    }
  }

  private getColor(): Gdk.RGBA {
    const rgba = new Gdk.RGBA();
    rgba.parse("#3584e4");

    const styleContext = this.get_style_context();
    if (styleContext) {
      return styleContext.get_color();
    }
    return rgba;
  }
}
