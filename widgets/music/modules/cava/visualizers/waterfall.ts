import { Gtk } from "ags/gtk4";
import Gsk from "gi://Gsk";
import {
  WaterfallState,
  shouldVisualize,
  getVisualizerDimensions,
  createColorWithOpacity,
  fillPath,
} from "../utils";

export function drawWaterfall(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
  state: WaterfallState,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  // Smooth transition - reuse array
  const smoothedValues = new Float32Array(bars);
  if (state.historyFrames.length > 0) {
    const lastFrame = state.historyFrames[0];
    const alpha = state.transitionAlpha;
    const oneMinusAlpha = 1 - alpha;

    for (let i = 0; i < bars && i < values.length; i++) {
      smoothedValues[i] = alpha * values[i] + oneMinusAlpha * lastFrame[i];
    }
  } else {
    for (let i = 0; i < bars && i < values.length; i++) {
      smoothedValues[i] = values[i];
    }
  }

  state.historyFrames.unshift(Array.from(smoothedValues));
  if (state.historyFrames.length > state.maxHistoryFrames) {
    state.historyFrames.pop();
  }

  const frameHeight = height / state.maxHistoryFrames;
  const renderPoints = bars * 3;
  const barWidth = width / (renderPoints - 1);
  const heightScale = frameHeight * 0.85;

  const frameCount = state.historyFrames.length;

  for (let frame = 0; frame < frameCount; frame++) {
    const frameValues = state.historyFrames[frame];
    const pathBuilder = new Gsk.PathBuilder();
    const frameY = frame * frameHeight;
    const frameBottom = frameY + frameHeight;

    const opacity = 1 - Math.pow(frame / state.maxHistoryFrames, 1.2) * 0.9;

    pathBuilder.move_to(0, frameBottom - heightScale * frameValues[0]);

    for (let i = 1; i < renderPoints; i++) {
      const dataPos = (i / renderPoints) * (bars - 1);
      const dataIndex = Math.floor(dataPos);
      const fraction = dataPos - dataIndex;

      const value =
        dataIndex >= bars - 1
          ? frameValues[bars - 1]
          : frameValues[dataIndex] * (1 - fraction) +
            frameValues[dataIndex + 1] * fraction;

      const x = i * barWidth;
      const y = frameBottom - heightScale * value;

      if (i % 3 === 0) {
        pathBuilder.line_to(x, y);
      } else {
        const prevIndex = Math.floor(((i - 1) / renderPoints) * (bars - 1));
        const prevFraction = ((i - 1) / renderPoints) * (bars - 1) - prevIndex;
        const prevValue =
          prevIndex >= bars - 1
            ? frameValues[bars - 1]
            : frameValues[prevIndex] * (1 - prevFraction) +
              frameValues[Math.min(bars - 1, prevIndex + 1)] * prevFraction;

        const prevX = (i - 1) * barWidth;
        const prevY = frameBottom - heightScale * prevValue;
        const ctrlX = (prevX + x) / 2;

        pathBuilder.quad_to(ctrlX, prevY, x, y);
      }
    }

    pathBuilder.line_to(width, frameBottom);
    pathBuilder.line_to(0, frameBottom);
    pathBuilder.close();

    const frameColor = createColorWithOpacity(color, opacity);
    fillPath(snapshot, pathBuilder, frameColor);
  }
}
