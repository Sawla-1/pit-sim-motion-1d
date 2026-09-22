import { useState } from "react";

const MIN_ZOOM_WINDOW = 1; // seconds - smallest visible x-axis window when zoomed in

// Shifts a [min,max] window by 20% of its own width, clamped to [lower,
// upper]. Shared by the x-axis (time) and y-axis (value) pan handlers -
// only the bounds differ between them. Returns null when already fully
// zoomed out (nothing to pan).
function panWindow(current, lower, upper, direction) {
  const width = current.max - current.min;
  if (width >= upper - lower) return null;

  const step = width * 0.2 * direction;
  let min = current.min + step;
  let max = current.max + step;

  if (min < lower) {
    max -= min - lower;
    min = lower;
  } else if (max > upper) {
    min -= max - upper;
    max = upper;
  }

  return { min, max };
}

// Owns all zoom/pan/reset state for the three charts:
// - X-axis (time) is a single React-state window shared across all charts,
//   since they all share the same time axis.
// - Y-axis (value) zoom/pan is independent per chart, keyed by chart index.
// Zoom is only shown in playback mode (see Charts.jsx), where the recorded
// data is fixed and never grows.
export function useChartZoom(data) {
  const [xRange, setXRange] = useState(null);
  const [yRanges, setYRanges] = useState({});

  const maxTime = data.recordedData[data.recordedData.length - 1].time;

  // ---- X-axis: shared time window across all 3 charts ----

  const handleXZoom = (factor) => {
    if (maxTime === 0) return;
    if (factor > 1 && maxTime < MIN_ZOOM_WINDOW) return; // not enough data to zoom in

    const currentMax = xRange?.max ?? maxTime;
    const requestedMax = currentMax / factor;
    const newMax = factor > 1
      ? Math.max(MIN_ZOOM_WINDOW, requestedMax) // zoom in: never shrink below MIN_ZOOM_WINDOW
      : Math.min(maxTime, requestedMax);         // zoom out: never exceed full data

    // Reset to null (full/auto range) instead of an explicit {0, maxTime}
    // snapshot once zoomed all the way out - null auto-tracks a still-growing
    // recording, a frozen snapshot would go stale the moment more data comes in.
    setXRange(newMax >= maxTime ? null : { min: 0, max: newMax });
  };

  // X-axis (time) is shared React state across all three charts - not a
  // native Chart.js scale - so panning moves the xRange window instead,
  // the same way handleXZoom resizes it. Clamped to [0, maxTime].
  const handleXPan = (direction) => {
    if (maxTime === 0) return;
    const current = { min: xRange?.min ?? 0, max: xRange?.max ?? maxTime };
    const next = panWindow(current, 0, maxTime, direction);
    if (next) setXRange(next);
  };

  // X-axis disabled states - button should visibly reflect when a click
  // would be a no-op, since x-zoom/pan state is already tracked in React.
  const xZoomInDisabled = maxTime < MIN_ZOOM_WINDOW ||
    (xRange !== null && xRange.max - xRange.min <= MIN_ZOOM_WINDOW);
  const xZoomOutDisabled = maxTime === 0 || xRange === null || xRange.max - xRange.min >= maxTime;
  const xPanLeftDisabled = maxTime === 0 || xRange === null || xRange.min <= 0;
  const xPanRightDisabled = maxTime === 0 || xRange === null || xRange.max >= maxTime;

  // ---- Y-axis: independent per chart, same pattern as the x-axis above ----

  // Padded so a flat/near-constant dataset (e.g. acceleration held at 0, or a
  // perfectly steady velocity) doesn't give zoom-in a zero-width range to
  // shrink toward - without padding, a single zoom-in click would collapse
  // the y-axis down to nothing (no ticks, invisible line). yMinRange is the
  // floor the zoomed window itself can shrink to, so repeated zoom-ins stop
  // cleanly instead of collapsing the axis.
  const getYRange = (valueKey) => {
    const values = data.recordedData.map((state) => state[valueKey]);
    const rawMin = values.reduce((a, b) => Math.min(a, b));
    const rawMax = values.reduce((a, b) => Math.max(a, b));
    const span = rawMax - rawMin;
    const pad = span > 0 ? span * 0.1 : Math.max(Math.abs(rawMax), Math.abs(rawMin), 1) * 0.1;
    return { yMin: rawMin - pad, yMax: rawMax + pad, yMinRange: pad };
  };

  // Zooms around the center of the current window (unlike the x-axis, a
  // value axis has no natural zero anchor to zoom from).
  const handleYZoom = (valueKey, index, factor) => {
    if (maxTime === 0) return;
    const { yMin, yMax, yMinRange } = getYRange(valueKey);
    const current = yRanges[index] ?? { min: yMin, max: yMax };
    const width = current.max - current.min;
    if (factor > 1 && width <= yMinRange) return; // already at the smallest allowed window

    const newWidth = factor > 1
      ? Math.max(yMinRange, width / factor)    // zoom in: never shrink below yMinRange
      : Math.min(yMax - yMin, width / factor); // zoom out: never exceed full data view

    // At the full-range floor, reset to undefined (full/auto range) instead
    // of an explicit {yMin, yMax} snapshot - undefined auto-tracks a
    // still-growing recording, while a frozen snapshot would go stale the
    // moment more data comes in (and computing it via mid/halfWidth risks a
    // floating-point hair-short edge that desyncs one pan button anyway).
    if (newWidth >= yMax - yMin) {
      setYRanges((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    const halfWidth = newWidth / 2;
    // Clamp the center so a wide window can't spill past [yMin, yMax] on one
    // side even though its width is already capped correctly.
    const mid = Math.min(Math.max((current.min + current.max) / 2, yMin + halfWidth), yMax - halfWidth);

    setYRanges((prev) => ({ ...prev, [index]: { min: mid - halfWidth, max: mid + halfWidth } }));
  };

  // Same shifting logic as handleXPan, clamped to [yMin, yMax] instead of [0, maxTime].
  const handleYPan = (valueKey, index, direction) => {
    if (maxTime === 0) return;
    const { yMin, yMax } = getYRange(valueKey);
    const current = yRanges[index] ?? { min: yMin, max: yMax };
    const next = panWindow(current, yMin, yMax, direction);
    if (next) setYRanges((prev) => ({ ...prev, [index]: next }));
  };

  // Y-axis disabled states, mirroring the x-axis ones above.
  const getYDisabled = (valueKey, index) => {
    const { yMin, yMax, yMinRange } = getYRange(valueKey);
    const current = yRanges[index];
    return {
      zoomInDisabled: maxTime === 0 || (current !== undefined && current.max - current.min <= yMinRange),
      zoomOutDisabled: maxTime === 0 || current === undefined || current.max - current.min >= yMax - yMin,
      panUpDisabled: maxTime === 0 || current === undefined || current.max >= yMax,
      panDownDisabled: maxTime === 0 || current === undefined || current.min <= yMin,
    };
  };

  // ---- Reset (touches both axes) ----

  // Resets this chart's y-axis zoom/pan, and the shared x-axis window
  // (which resets it for all three charts, same as x-zoom/pan already do).
  const handleReset = (index) => {
    setXRange(null);
    setYRanges((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const isResetDisabled = (index) => xRange === null && yRanges[index] === undefined;

  return {
    maxTime,
    xRange,
    yRanges,
    handleXZoom,
    handleXPan,
    xZoomInDisabled,
    xZoomOutDisabled,
    xPanLeftDisabled,
    xPanRightDisabled,
    handleYZoom,
    handleYPan,
    getYDisabled,
    handleReset,
    isResetDisabled,
  };
}
