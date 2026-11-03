import { niceStep } from "./niceStep";

// Turns a value into a pixel.
// makeScale(0, 10, 0, 500)(5) → 250
// The two min/max pairs must not be empty (min ≠ max), or you get Infinity.
export function makeScale(domainMin, domainMax, pixelMin, pixelMax) {
  const ratio = (pixelMax - pixelMin) / (domainMax - domainMin);
  return (value) => pixelMin + (value - domainMin) * ratio;
}

// Pixel back to value (used when you drag to find the time).
// It is the same function with the two ranges swapped.
// invertScale(0, 500, 0, 10)(250) → 5
export const invertScale = makeScale;

// Round tick values for the time axis. Bounds are left out
// (like Chart.js `includeBounds: false`).
// makeTicks(0, 10, 5) → [2, 4, 6, 8]
export function makeTicks(min, max, maxCount) {
  if (!(max > min)) return [];
  const step = niceStep(max - min, maxCount);
  const ticks = [];
  for (let i = Math.ceil(min / step); i * step < max; i++) {
    const value = Number((i * step).toFixed(10)); // hides 0.30000000000000004
    if (value > min) ticks.push(value);
  }
  return ticks;
}

// `count` evenly spaced values, bounds included (for the 5 y lines).
// evenTicks(-5, 15, 5) → [-5, 0, 5, 10, 15]
export function evenTicks(min, max, count) {
  return Array.from(
    { length: count },
    (_, i) => min + ((max - min) * i) / Math.max(count - 1, 1)
  );
}

// Keeps the line's shape with far fewer points: for each pixel column,
// keep only the lowest and the highest point, so spikes and dips stay.
// `points` = [{ x, y }, ...] sorted by x.
// Points outside [xMin, xMax] are dropped, except one on each side,
// so the line still enters and leaves the plot.
export function decimateMinMax(points, xMin, xMax, pixelWidth) {
  // 1. Cut to the visible part (plus one neighbour on each side)
  const firstInside = points.findIndex((p) => p.x >= xMin);
  if (firstInside === -1) return [];
  const firstOutside = points.findIndex((p) => p.x > xMax);
  const from = Math.max(0, firstInside - 1);
  const to = firstOutside === -1 ? points.length : firstOutside + 1;
  const visible = points.slice(from, to);

  // 2. Few enough points already (up to 4 per pixel column): keep all
  if (!(xMax > xMin) || visible.length <= pixelWidth * 4) return visible;

  // 3. Group by pixel column, keep the lowest and highest of each group
  const toColumn = makeScale(xMin, xMax, 0, pixelWidth);
  const result = [];
  const addGroup = (g) => {
    if (g.low === g.high) result.push(g.low);
    else if (g.low.x < g.high.x) result.push(g.low, g.high); // keep x order
    else result.push(g.high, g.low);
  };

  let group = null;
  for (const p of visible) {
    const column = Math.floor(toColumn(p.x));
    if (!group || group.column !== column) {
      if (group) addGroup(group);
      group = { column, low: p, high: p };
    } else {
      if (p.y < group.low.y) group.low = p;
      if (p.y > group.high.y) group.high = p;
    }
  }
  addGroup(group);
  return result;
}

// Pixel points → the text an SVG <path d="..."> needs.
// toPath([{ x: 0, y: 0 }, { x: 5, y: 3 }]) → "M0.0 0.0L5.0 3.0"
export function toPath(pixelPoints) {
  return pixelPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join("");
}
