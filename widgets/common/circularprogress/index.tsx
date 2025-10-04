import { Accessor, jsx } from "ags";
import { Gtk } from "ags/gtk4";
import Gsk from "gi://Gsk?version=4.0";
import { CircularProgressBarWidget } from "./CircularProgressBar.ts";

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
  children?: Gtk.Widget | Gtk.Widget[];
}

export function CircularProgressBar({
  percentage,
  inverted,
  centerFilled,
  radiusFilled,
  lineWidth,
  lineCap,
  fillRule,
  startAt,
  endAt,
  children,
}: CircularProgressProps): CircularProgressBarWidget {
  const widget = jsx(CircularProgressBarWidget, {
    percentage,
    inverted,
    centerFilled,
    radiusFilled,
    lineWidth,
    lineCap,
    fillRule,
    startAt,
    endAt,
  });

  if (children) {
    const childArray = Array.isArray(children) ? children : [children];

    // Wrap multiple children in a Box
    if (childArray.length === 1) {
      widget.child = childArray[0];
    } else if (childArray.length > 1) {
      const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
      });

      childArray.forEach((child) => box.append(child));
      widget.child = box;
    }
  }

  return widget;
}
