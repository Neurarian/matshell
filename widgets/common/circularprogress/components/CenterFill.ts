import { Gtk, Gdk } from "ags/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { register, property } from "ags/gobject";

@register({ GTypeName: "CenterFill" })
export class CenterFillWidget extends Gtk.Widget {
  static {
    Gtk.Widget.set_css_name.call(this, "center");
  }

  @property(Number) centerX = 0;
  @property(Number) centerY = 0;
  @property(Number) delta = 0;

  private _fillRule: Gsk.FillRule = Gsk.FillRule.EVEN_ODD;

  get fillRule(): Gsk.FillRule {
    return this._fillRule;
  }

  set fillRule(value: Gsk.FillRule) {
    if (this._fillRule !== value) {
      this._fillRule = value;
      this.queue_draw();
    }
  }

  updateGeometry(
    centerX: number,
    centerY: number,
    delta: number,
    fillRule: Gsk.FillRule,
  ): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.delta = delta;
    this.fillRule = fillRule;
    this.queue_draw();
  }

  vfunc_snapshot(snapshot: Gtk.Snapshot): void {
    const color = this.getColor();
    const pathBuilder = new Gsk.PathBuilder();

    pathBuilder.add_circle(
      new Graphene.Point({ x: this.centerX, y: this.centerY }),
      this.delta,
    );

    snapshot.append_fill(pathBuilder.to_path(), this._fillRule, color);
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
