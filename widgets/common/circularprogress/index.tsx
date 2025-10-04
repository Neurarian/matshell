import { Accessor, jsx } from "ags";
import { Gtk } from "ags/gtk4";
import Gsk from "gi://Gsk?version=4.0";
import { CircularProgressBarWidget } from "./CircularProgressBar.ts";

function isGtkWidget(obj: any): obj is Gtk.Widget {
  return obj instanceof Gtk.Widget;
}

export interface CircularProgressProps {
  percentage?: number | Accessor<number>;
  inverted?: boolean;
  centerFilled?: boolean;
  radiusFilled?: boolean;
  lineWidth?: number;
  lineCap?: Gsk.LineCap;
  fillRule?: Gsk.FillRule;
  startAt?: number;
  endAt?: number;
  children?: JSX.Element | JSX.Element[];
}

export function CircularProgressBar({
  children,
  ...props
}: CircularProgressProps): CircularProgressBarWidget {
  const widget = jsx(CircularProgressBarWidget, props);

  if (children) {
    const childArray = Array.isArray(children) ? children : [children];
    const validChildren = childArray.filter(isGtkWidget);

    if (validChildren.length === 0) {
      console.warn("CircularProgressBar: no valid Gtk.Widget children");
    } else if (validChildren.length === 1) {
      widget.child = validChildren[0];
    } else {
      const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
      });
      validChildren.forEach((child) => box.append(child));
      widget.child = box;
    }
  }

  return widget;
}
