import { useState } from "react";
import { newItemsStart } from "../utils/newItemsStart";

// Allowed gaps between the 5 y-axis lines (0.1 is the smallest).
const STEPS = [
  0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000,
];

// Allowed widths of the time window (seconds) when zoomed in: the same list
// as STEPS, from 1 s up (the time window is never under 1 s wide).
const TIME_WIDTHS = STEPS.filter((step) => step >= 1);

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
  const from = newItemsStart(old.data, recordedData);
  const result = {};
  for (const key of keys) {
    const range = from > 0 ? lowHigh(recordedData, key, from, old.byKey[key]) : lowHigh(recordedData, key);
    result[key] = { ...range, window: windowFor(range) };
  }
  return result;
}

// Owns all zoom/pan/reset state for the three charts:
// - X-axis (time) is a single React-state window shared across all charts,
//   since they all share the same time axis: null = show everything, or
//   { start, width } in seconds.
// - Y-axis (value) zoom/pan is independent per chart, keyed by the chart's key.
// Zoom is only shown in playback mode (see Charts.jsx). Between two visits to
// Playback the recording can get longer (more is recorded), never shorter, so
// a zoomed window still fits it. Clear Data and Reset All forget the zoom.
// valueKeys = the charts' keys in chart order (a constant array)
export function useChartZoom(data, valueKeys) {
  const [timeZoom, setTimeZoom] = useState(null);
  const [yRanges, setYRanges] = useState({});

  // Clear Data and Reset All start a new recording: its first point is a new object
  // (recording more only adds points after it). The old zoom doesn't fit the new
  // data, so forget it. (React's way to reset state when a prop changes: remember
  // the value and compare it while rendering, instead of an effect.)
  const firstPoint = data.recordedData[0];
  const [zoomedFirstPoint, setZoomedFirstPoint] = useState(firstPoint);
  if (firstPoint !== zoomedFirstPoint) {
    setZoomedFirstPoint(firstPoint);
    setTimeZoom(null);
    setYRanges({});
  }

  const maxTime = data.recordedData[data.recordedData.length - 1].time;

  // ---- X-axis: shared time window across all 3 charts ----

  // The window `width` seconds wide that starts at `start`, kept inside
  // 0..maxTime. null = show everything (it then grows with the recording).
  const timeWindow = (start, width) => {
    if (width >= maxTime) return null;
    return { start: Math.max(0, Math.min(start, maxTime - width)), width };
  };

  // Zoom: the next smaller (+1 = in) or bigger (-1 = out) width in TIME_WIDTHS.
  // The left edge stays where it is. No bigger width left = show everything.
  const handleXZoom = (direction) => {
    const width = timeZoom?.width ?? maxTime;
    const next = direction > 0 ? TIME_WIDTHS.findLast((w) => w < width) : TIME_WIDTHS.find((w) => w > width);
    setTimeZoom(timeWindow(timeZoom?.start ?? 0, next ?? Infinity));
  };

  // Pan: move by 20% of the window
  const handleXPan = (direction) => {
    if (!timeZoom) return; // showing everything: nothing to pan
    setTimeZoom(timeWindow(timeZoom.start + timeZoom.width * 0.2 * direction, timeZoom.width));
  };

  // Which time buttons are greyed out (a click would do nothing)
  const xZoomInDisabled = (timeZoom?.width ?? maxTime) <= TIME_WIDTHS[0];
  const xZoomOutDisabled = timeZoom === null;
  const xPanLeftDisabled = timeZoom === null || timeZoom.start <= 0;
  const xPanRightDisabled = timeZoom === null || timeZoom.start >= maxTime - timeZoom.width;

  // What the charts show: the zoomed window, or everything
  const timeView = timeZoom
    ? { min: timeZoom.start, max: timeZoom.start + timeZoom.width }
    : { min: 0, max: maxTime };

  // ---- Y-axis: 5 round lines, independent per chart ----

  // Default view of each chart: the smallest round window that covers all
  // its data. Worked out only when the recording changes, and while
  // recording only the new points are read (it used to re-read the whole
  // recording every frame). Same "remember and compare while rendering"
  // pattern as the zoom reset above.
  const [ranges, setRanges] = useState({ data: null, keys: null, byKey: null });
  let byKey = ranges.byKey;
  if (ranges.data !== data.recordedData || ranges.keys !== valueKeys) {
    // Different charts (keys): nothing to reuse, so read everything
    const old = ranges.keys === valueKeys ? ranges : { data: null, byKey: null };
    byKey = growRanges(old, data.recordedData, valueKeys);
    setRanges({ data: data.recordedData, keys: valueKeys, byKey });
  }
  const fitWindow = (valueKey) => byKey[valueKey].window;

  // What a chart shows now: its zoomed window, or the default view.
  const getYWindow = (valueKey) => yRanges[valueKey] ?? fitWindow(valueKey);

  // Zoom: one step smaller (+1 = in) or bigger (-1 = out) in STEPS. The zoom
  // buttons are disabled at both ends of the list, so `step` always exists here.
  const handleYZoom = (valueKey, direction) => {
    const current = getYWindow(valueKey);
    const step = STEPS[STEPS.indexOf(current.step) - direction];
    const center = (current.min + current.max) / 2;
    // Back at the default size → forget the zoom.
    const next = step >= fitWindow(valueKey).step ? undefined : makeWindow(center, step);
    setYRanges((prev) => ({ ...prev, [valueKey]: next }));
  };

  // Pan: move exactly 1 line up (+1) or down (-1). The pan buttons are
  // disabled until the chart is zoomed, so `current` always exists here.
  const handleYPan = (valueKey, direction) => {
    const current = yRanges[valueKey];
    const center = (current.min + current.max) / 2 + direction * current.step;
    setYRanges((prev) => ({ ...prev, [valueKey]: makeWindow(center, current.step) }));
  };

  // Which y buttons are greyed out.
  const getYDisabled = (valueKey) => {
    const current = yRanges[valueKey];
    const fit = fitWindow(valueKey);
    return {
      zoomInDisabled: getYWindow(valueKey).step === STEPS[0],
      zoomOutDisabled: !current,
      // Pan stops at the top/bottom of the default (full data) view. Half a
      // step of slack absorbs float noise (15.000000000000002) and zoom steps
      // whose lines can't land exactly on the edge (step 2 inside -5..15).
      panUpDisabled: !current || current.max + current.step / 2 >= fit.max,
      panDownDisabled: !current || current.min - current.step / 2 <= fit.min,
    };
  };

  // ---- Zoom to the two pins ----

  // Time: from A to B with some space around (never under the smallest width),
  // with the two pins in the middle.
  // Value: each chart gets the smallest round window that covers both pins.
  const zoomToPins = (pins) => {
    const low = Math.min(pins[0].time, pins[1].time);
    const high = Math.max(pins[0].time, pins[1].time);
    const width = Math.max(TIME_WIDTHS[0], (high - low) * 1.5);
    setTimeZoom(timeWindow((low + high) / 2 - width / 2, width));

    const next = {};
    for (const key of valueKeys) {
      const pinWindow = windowFor(lowHigh(pins, key));
      if (pinWindow.step < fitWindow(key).step) next[key] = pinWindow;
    }
    setYRanges(next);
  };

  // ---- Reset ----

  // Resets this chart's y-axis zoom/pan. With `withTime` (the bottom chart's
  // reset, which sits under both button groups) it also resets the shared
  // time window for all three charts.
  const handleReset = (valueKey, withTime) => {
    if (withTime) setTimeZoom(null);
    setYRanges((prev) => {
      const next = { ...prev };
      delete next[valueKey];
      return next;
    });
  };

  // Off when there is nothing to reset (time only counts with `withTime`)
  const isResetDisabled = (valueKey, withTime) =>
    yRanges[valueKey] === undefined && (!withTime || timeZoom === null);

  return {
    maxTime,
    timeView,
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
