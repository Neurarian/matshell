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
  children?: JSX.Element;
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
    if (isGtkWidget(children)) {
      widget.child = children;
    } else {
      console.warn("CircularProgressBar: child is not a Gtk.Widget");
    }
  }

  return widget;
}
