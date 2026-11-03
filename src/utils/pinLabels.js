const GAP = 14; // space between the dot and its label
const LETTER_W = 18; // room for the big letter (A / B)
const LABEL_H = 28;

// Rough width of the label box (about 7px per character, same as before)
const labelWidth = (text) => text.length * 7 + 12;

// The rectangle that the letter + label fill. sx: 1 = right of the dot, -1 = left.
function labelRect(pin, sx, top) {
  const width = LETTER_W + labelWidth(pin.text);
  const left = sx > 0 ? pin.x + GAP : pin.x - GAP - width;
  return { left, top, right: left + width, bottom: top + LABEL_H };
}

const overlaps = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Must stay inside the plot sideways
const fitsAcross = (rect, plot) => rect.left >= plot.left && rect.right <= plot.right;

// Every spot this pin's label could go, best first: the preferred side first,
// then the other side. On each side: above the dot, below it, beside it, then
// the very top and the very bottom of the plot. Spots are kept inside the plot.
function spotsFor(pin, plot) {
  const lowest = plot.bottom - LABEL_H;
  const inside = (top) => Math.max(plot.top, Math.min(top, lowest));
  const above = inside(pin.y - GAP - LABEL_H);
  const below = inside(pin.y + GAP);
  const beside = inside(pin.y - LABEL_H / 2);
  const roomAbove = pin.y - plot.top > LABEL_H + GAP;
  const tops = [...new Set(roomAbove
    ? [above, below, beside, plot.top, lowest]
    : [below, above, beside, lowest, plot.top])];

  const rightFirst = fitsAcross(labelRect(pin, 1, plot.top), plot);
  const sides = rightFirst ? [1, -1] : [-1, 1];
  const spots = sides
    .flatMap((sx) => tops.map((top) => ({ sx, rect: labelRect(pin, sx, top) })))
    .filter((spot) => fitsAcross(spot.rect, plot));
  // Plot narrower than the label: nothing fits, use the first choice anyway
  return spots.length ? spots : [{ sx: sides[0], rect: labelRect(pin, sides[0], tops[0]) }];
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
  const options = pins.map((pin) => spotsFor(pin, plot));

  // Try the combinations (a few pins, a few spots each) and keep the one with
  // no overlaps that is closest to everyone's first choice.
  let best = null;
  const search = (i, picked, cost) => {
    if (best && cost >= best.cost) return;
    if (i === pins.length) {
      best = { cost, picked };
      return;
    }
    options[i].forEach((spot, rank) => {
      const clash = [...fixed, ...picked.map((p) => p.rect)].some((t) => overlaps(spot.rect, t));
      if (!clash) search(i + 1, [...picked, spot], cost + rank);
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
      letterX: sx > 0 ? rect.left + LETTER_W / 2 : rect.right - LETTER_W / 2,
      boxLeft: sx > 0 ? rect.left + LETTER_W : rect.left,
      boxWidth: rect.right - rect.left - LETTER_W,
      centerY: (rect.top + rect.bottom) / 2,
    };
  });
}
