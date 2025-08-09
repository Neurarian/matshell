import { Accessor } from "ags";
import { CircularProgressBarWidget } from "./CircularProgressBar.ts";
import { CircularProgressProps } from "./types.ts";

export function CircularProgressBar(props: CircularProgressProps) {
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
