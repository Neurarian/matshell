import { Gtk, Gsk } from "ags/gtk4";
import { Accessor } from "ags";

export interface GeometryUpdate {
  center_x: number;
  center_y: number;
  delta: number;
  width?: number;
  height?: number;
}

export interface ProgressArcGeometry extends GeometryUpdate {
  line_width: number;
  line_cap: Gsk.LineCap;
  start_at: number;
  end_at: number;
  inverted: boolean;
  percentage: number;
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
  child?: Gtk.Widget;
  children?: Gtk.Widget;
}
