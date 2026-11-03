const GAP = 14; // space between the dot and its label
const LETTER_W = 18; // room for the big letter (A / B)
const LABEL_H = 26; // same as the chip's height

// Rough width of the label box (about 7px per character, same as before)
const labelWidth = (text) => text.length * 7 + 12;

// The rectangle that the letter + label fill.
// sx: 1 = right of the dot, -1 = left, 0 = centered on the dot (kept inside the plot).
function labelRect(pin, sx, top, plot) {
  const width = LETTER_W + labelWidth(pin.text);
  let left;
  if (sx > 0) left = pin.x + GAP;
  else if (sx < 0) left = pin.x - GAP - width;
  else left = Math.max(plot.left, Math.min(pin.x - width / 2, plot.right - width));
  return { left, top, right: left + width, bottom: top + LABEL_H };
}

const overlaps = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// How far the rectangle is from the dot (nearest edge to the dot's centre)
function distanceToDot(rect, pin) {
  const dx = Math.max(rect.left - pin.x, 0, pin.x - rect.right);
  const dy = Math.max(rect.top - pin.y, 0, pin.y - rect.bottom);
  return Math.hypot(dx, dy);
}

// Must stay inside the plot sideways
const fitsAcross = (rect, plot) => rect.left >= plot.left && rect.right <= plot.right;

// Every spot this pin's label could go, best first: the preferred side first,
// then the other side. On each side: above the dot, below it, beside it, then
// every row down the plot. Spots are kept inside the plot.
function spotsFor(pin, plot, keepClear) {
  const lowest = plot.bottom - LABEL_H;
  const inside = (top) => Math.max(plot.top, Math.min(top, lowest));
  const above = inside(pin.y - GAP - LABEL_H);
  const below = inside(pin.y + GAP);
  const beside = inside(pin.y - LABEL_H / 2);
  const roomAbove = pin.y - plot.top > LABEL_H + GAP;
  // Rows to try: the three next to the dot first, then every half label height
  // down the plot, so a label can always find a free row close by.
  const steps = Math.ceil((lowest - plot.top) / (LABEL_H / 2));
  const rows = Array.from({ length: steps + 1 }, (_, i) => plot.top + ((lowest - plot.top) * i) / steps);
  const tops = [...new Set([...(roomAbove ? [above, below, beside] : [below, above, beside]), ...rows])];

  const rightFirst = fitsAcross(labelRect(pin, 1, plot.top, plot), plot);
  // Beside the dot first; centered above/below it only when the sides do not fit
  const sides = rightFirst ? [1, -1, 0] : [-1, 1, 0];
  const all = sides.flatMap((sx) => tops.map((top) => ({ sx, rect: labelRect(pin, sx, top, plot) })));
  // A spot that touches a keep-clear box (the hide button) is also tried slid
  // to the left of that box, a bit away from its dot but not covering the button.
  const slid = all.flatMap((spot) => {
    const box = keepClear.find((k) => overlaps(spot.rect, k));
    if (!box || spot.sx > 0) return [];
    const move = spot.rect.right - (box.left - 2);
    return [{ ...spot, rect: { ...spot.rect, left: spot.rect.left - move, right: spot.rect.right - move } }];
  });
  const spots = [...all, ...slid].filter((spot) => fitsAcross(spot.rect, plot));
  // Plot narrower than the label: nothing fits, use the first choice anyway
  return spots.length ? spots : [{ sx: sides[0], rect: labelRect(pin, sides[0], tops[0], plot) }];
}

// pins = [{ name, x, y, text }] in pixels; plot = { left, right, top, bottom }.
// keepClear = rectangles that labels must not cover (e.g. the hide button).
// Gives each pin a spot for its letter and label so that nothing overlaps.
export function placePinLabels(pins, plot, keepClear = []) {
  // Dots count as obstacles too, so a label never covers a dot
  const fixed = [
    ...keepClear,
    ...pins.map((p) => ({ left: p.x - 7, right: p.x + 7, top: p.y - 7, bottom: p.y + 7 })),
  ];
  const options = pins.map((pin) => spotsFor(pin, plot, keepClear));

  // Try the combinations (a few pins, a few spots each) and keep the one with
  // no overlaps with the labels closest to their dots (the spot order breaks ties).
  let best = null;
  const search = (i, picked, cost) => {
    if (best && cost >= best.cost) return;
    if (i === pins.length) {
      best = { cost, picked };
      return;
    }
    options[i].forEach((spot, rank) => {
      const clash = [...fixed, ...picked.map((p) => p.rect)].some((t) => overlaps(spot.rect, t));
      if (!clash) search(i + 1, [...picked, spot], cost + distanceToDot(spot.rect, pins[i]) + rank / 100);
    });
  };
  search(0, [], 0);

  // Nothing without overlaps: fall back to everyone's first choice
  const chosen = best ? best.picked : options.map((spots) => spots[0]);

  return pins.map((pin, i) => {
    const { sx, rect } = chosen[i];
    return {
      name: pin.name,
      text: pin.text,
      letterX: sx >= 0 ? rect.left + LETTER_W / 2 : rect.right - LETTER_W / 2,
      boxLeft: sx >= 0 ? rect.left + LETTER_W : rect.left,
      boxWidth: rect.right - rect.left - LETTER_W,
      centerY: (rect.top + rect.bottom) / 2,
    };
  });
}
