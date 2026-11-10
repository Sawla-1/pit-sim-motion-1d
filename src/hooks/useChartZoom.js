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

// The lowest and highest item[key], reading from items[from] on,
// starting from `start` (the low/high found so far).
// lowHigh([{ x: 1 }, { x: 3.2 }, { x: 7 }], "x") → { low: 1, high: 7 }
function lowHigh(items, key, from = 0, start = { low: Infinity, high: -Infinity }) {
  // A plain loop, not Math.min(...): a very long recording is too many
  // values for one call and would crash
  let { low, high } = start;
  for (let i = from; i < items.length; i++) {
    low = Math.min(low, items[i][key]);
    high = Math.max(high, items[i][key]);
  }
  return { low, high };
}

// The smallest round window that covers low..high.
// windowFor({ low: 1, high: 7 }) → lines 0, 2, 4, 6, 8 (step 2)
function windowFor({ low, high }) {
  const windows = STEPS.map((step) => makeWindow((low + high) / 2, step));
  return windows.find((w) => w.min <= low && w.max >= high) ?? windows.at(-1);
}

// Each chart's low/high and default window for a recording. `old` = the
// result for an earlier version of it. A recording only grows (points are
// added, never changed), so if the old last point is still in the same
// place, only the new points are read. Otherwise (Clear, Reset, trim)
// everything is read again.
function growRanges(old, recordedData, keys) {
  const oldCount = old.data?.length ?? 0;
  const grown = oldCount > 0 && recordedData[oldCount - 1] === old.data[oldCount - 1];
  const result = {};
  for (const key of keys) {
    const range = grown ? lowHigh(recordedData, key, oldCount, old.byKey[key]) : lowHigh(recordedData, key);
    result[key] = { ...range, window: windowFor(range) };
  }
  return result;
}

// Owns all zoom/pan/reset state for the three charts:
// - X-axis (time) is a single React-state window shared across all charts,
//   since they all share the same time axis.
// - Y-axis (value) zoom/pan is independent per chart, keyed by chart index.
// Zoom is only shown in playback mode (see Charts.jsx), where the recorded
// data is fixed and never grows.
// valueKeys = the charts' keys in chart order (a constant array)
export function useChartZoom(data, valueKeys) {
  const [xRange, setXRange] = useState(null);
  const [yRanges, setYRanges] = useState({});

  // Clear Data and Reset All start a new recording: its first point is a new object
  // (recording more only adds points after it). The old zoom doesn't fit the new
  // data, so forget it. (React's way to reset state when a prop changes: remember
  // the value and compare it while rendering, instead of an effect.)
  const firstPoint = data.recordedData[0];
  const [zoomedFirstPoint, setZoomedFirstPoint] = useState(firstPoint);
  if (firstPoint !== zoomedFirstPoint) {
    setZoomedFirstPoint(firstPoint);
    setXRange(null);
    setYRanges({});
  }

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
  // scale owned by one chart - so panning moves the xRange window instead,
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

  // Default view of each chart: the smallest round window that covers all
  // its data. Worked out only when the recording changes, and while
  // recording only the new points are read (it used to re-read the whole
  // recording every frame). Same "remember and compare while rendering"
  // pattern as the zoom reset above.
  const [ranges, setRanges] = useState({ data: null, byKey: null });
  let byKey = ranges.byKey;
  if (ranges.data !== data.recordedData) {
    byKey = growRanges(ranges, data.recordedData, valueKeys);
    setRanges({ data: data.recordedData, byKey });
  }
  const fitWindow = (valueKey) => byKey[valueKey].window;

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
  const getYDisabled = (valueKey, index) => {
    const current = yRanges[index];
    const fit = fitWindow(valueKey);
    return {
      zoomInDisabled: getYWindow(valueKey, index).step === STEPS[0],
      zoomOutDisabled: !current,
      // Pan stops at the top/bottom of the default (full data) view. Half a
      // step of slack absorbs float noise (15.000000000000002) and zoom steps
      // whose lines can't land exactly on the edge (step 2 inside -5..15).
      panUpDisabled: !current || current.max + current.step / 2 >= fit.max,
      panDownDisabled: !current || current.min - current.step / 2 <= fit.min,
    };
  };

  // ---- Zoom to the two pins ----

  // Time: from A to B with some space around (never under MIN_ZOOM_WINDOW).
  // Value: each chart gets the smallest round window that covers both pins.
  const zoomToPins = (pins) => {
    const low = Math.min(pins[0].time, pins[1].time);
    const high = Math.max(pins[0].time, pins[1].time);
    const width = Math.max(MIN_ZOOM_WINDOW, (high - low) * 1.5);
    const start = Math.max(0, Math.min((low + high) / 2 - width / 2, maxTime - width));
    setXRange(width >= maxTime ? null : { min: start, max: start + width });

    const next = {};
    valueKeys.forEach((key, index) => {
      const pinWindow = windowFor(lowHigh(pins, key));
      if (pinWindow.step < fitWindow(key).step) next[index] = pinWindow;
    });
    setYRanges(next);
  };

  // ---- Reset ----

  // Resets this chart's y-axis zoom/pan. With `withTime` (the bottom chart's
  // reset, which sits under both button groups) it also resets the shared
  // time window for all three charts.
  const handleReset = (index, withTime) => {
    if (withTime) setXRange(null);
    setYRanges((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // Off when there is nothing to reset (time only counts with `withTime`)
  const isResetDisabled = (index, withTime) =>
    yRanges[index] === undefined && (!withTime || xRange === null);

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
    zoomToPins,
    handleReset,
    isResetDisabled,
  };
}
