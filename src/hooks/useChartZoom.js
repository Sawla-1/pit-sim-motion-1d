import { useState } from "react";

const MIN_ZOOM_WINDOW = 1; // seconds - smallest visible x-axis window when zoomed in

// Tolerance for the zoom-in "at smallest window" checks below. Repeated
// width / factor divisions drift a hair past the floor (Math.max clamps the
// zoom itself correctly, but the raw comparison can land a few ULPs short),
// so without this the zoom-in button can stay visibly enabled at the limit.
const EPSILON = 1e-9;

// Shifts a [min,max] window by 20% of its own width, clamped to [lower,
// upper]. Used by the x-axis (time) pan. Returns null when already fully
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

// Allowed gaps between the 5 y-axis lines (0.1 is the smallest).
const STEPS = [
  0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000,
];

// 5 lines `step` apart, with the middle line on a round number.
// makeWindow(6.4, 2) → middle 6 → lines 2, 4, 6, 8, 10
function makeWindow(center, step) {
  const middle = Math.round(center / step) * step;
  return { min: middle - 2 * step, max: middle + 2 * step, step };
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
    (xRange !== null && xRange.max - xRange.min <= MIN_ZOOM_WINDOW + EPSILON);
  const xZoomOutDisabled = maxTime === 0 || xRange === null || xRange.max - xRange.min >= maxTime;
  const xPanLeftDisabled = maxTime === 0 || xRange === null || xRange.min <= 0;
  const xPanRightDisabled = maxTime === 0 || xRange === null || xRange.max >= maxTime;

  // ---- Y-axis: 5 round lines, independent per chart ----

  // Default view: the smallest round window that covers all the data.
  const fitWindow = (valueKey) => {
    const values = data.recordedData.map((state) => state[valueKey]);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const windows = STEPS.map((step) => makeWindow((low + high) / 2, step));
    return windows.find((w) => w.min <= low && w.max >= high) ?? windows.at(-1);
  };

  // What a chart shows now: its zoomed window, or the default view.
  const getYWindow = (valueKey, index) => yRanges[index] ?? fitWindow(valueKey);

  // Zoom: one step smaller (in) or bigger (out) in STEPS. The zoom buttons
  // are disabled at both ends of the list, so `step` always exists here.
  const handleYZoom = (valueKey, index, factor) => {
    const current = getYWindow(valueKey, index);
    const step = STEPS[STEPS.indexOf(current.step) + (factor > 1 ? -1 : 1)];
    const center = (current.min + current.max) / 2;
    // Back at the default size → forget the zoom.
    const next = step >= fitWindow(valueKey).step ? undefined : makeWindow(center, step);
    setYRanges((prev) => ({ ...prev, [index]: next }));
  };

  // Pan: move exactly 1 line up (+1) or down (-1). The pan buttons are
  // disabled until the chart is zoomed, so `current` always exists here.
  const handleYPan = (index, direction) => {
    const current = yRanges[index];
    const center = (current.min + current.max) / 2 + direction * current.step;
    setYRanges((prev) => ({ ...prev, [index]: makeWindow(center, current.step) }));
  };

  // Which y buttons are greyed out.
  const getYDisabled = (valueKey, index) => ({
    zoomInDisabled: getYWindow(valueKey, index).step === STEPS[0],
    zoomOutDisabled: yRanges[index] === undefined,
    panUpDisabled: yRanges[index] === undefined,
    panDownDisabled: yRanges[index] === undefined,
  });

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
    getYWindow,
    fitWindow,
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
