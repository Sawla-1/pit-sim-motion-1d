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

// Round tick values for the time axis. A tick that lands exactly on min or
// max is kept (like Chart.js).
// makeTicks(0, 10, 5) → [0, 2, 4, 6, 8, 10]
export function makeTicks(min, max, maxCount) {
  if (!(max > min)) return [];
  const step = niceStep(max - min, maxCount);
  const ticks = [];
  // the 1e-9 slack absorbs float noise at the two edges
  for (let i = Math.ceil(min / step - 1e-9); i * step <= max + step * 1e-9; i++) {
    ticks.push(Number((i * step).toFixed(10))); // hides 0.30000000000000004
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

// First index whose x is >= the given x (points are sorted by x)
function lowerBound(points, x) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (points[mid].x < x) low = mid + 1;
    else high = mid;
  }
  return low;
}

// The data point closest to the pointer, if it is within `radius` pixels.
// `scales` = { toX, toY, fromX } (value → pixel, and pixel → value for x).
// Returns the point ({ x, y } in data units) or null.
export function findNearestPoint(points, scales, pixelX, pixelY, radius) {
  const { toX, toY, fromX } = scales;
  const start = lowerBound(points, fromX(pixelX));
  let best = null;
  let bestDistance = radius * radius;

  const look = (i) => {
    const dx = toX(points[i].x) - pixelX;
    const dy = toY(points[i].y) - pixelY;
    const distance = dx * dx + dy * dy;
    if (distance <= bestDistance) {
      best = points[i];
      bestDistance = distance;
    }
    return Math.abs(dx) <= radius; // false = too far sideways, stop looking
  };

  for (let i = start; i < points.length && look(i); i++); // to the right
  for (let i = start - 1; i >= 0 && look(i); i--); // to the left
  return best;
}

// Points → the text an SVG <path d="..."> needs, in TENTHS of a pixel.
// Whole numbers turn into text about 5x faster than 104.5, and SvgChart draws
// the path with scale(0.1), so it lands exactly where 104.5 would.
// `toX` / `toY` turn a point's x / y into pixels.
// toPath([{ x: 0, y: 0 }, { x: 5, y: 3 }], (x) => x, (y) => y) → "M0 0L50 30"
export function toPath(points, toX, toY) {
  let d = "";
  for (let i = 0; i < points.length; i++) {
    d += (i === 0 ? "M" : "L") + Math.round(toX(points[i].x) * 10) + " " + Math.round(toY(points[i].y) * 10);
  }
  return d;
}
