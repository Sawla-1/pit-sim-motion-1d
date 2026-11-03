const GAP = 14; // space between the dot and its label
const LETTER_W = 18; // room for the big letter (A / B)
const LABEL_H = 28;

// Rough width of the label box (about 7px per character, same as before)
const labelWidth = (text) => text.length * 7 + 12;

// The rectangle that the letter + label fill.
// sx: 1 = right of the dot, -1 = left.  sy: -1 = above, 1 = below.
// On a short plot it is pushed back inside, so it never hangs out of the plot.
function labelRect(pin, sx, sy, plot) {
  const width = LETTER_W + labelWidth(pin.text);
  const left = sx > 0 ? pin.x + GAP : pin.x - GAP - width;
  const wantedTop = pin.y + sy * (GAP + LABEL_H / 2) - LABEL_H / 2;
  const top = Math.max(plot.top, Math.min(wantedTop, plot.bottom - LABEL_H));
  return { left, top, right: left + width, bottom: top + LABEL_H };
}

const overlaps = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Must stay inside the plot sideways
const fitsAcross = (rect, plot) => rect.left >= plot.left && rect.right <= plot.right;

// pins = [{ name, x, y, text }] in pixels; plot = { left, right, top, bottom }.
// keepClear = rectangles that labels must not cover (e.g. the hide button).
// Gives each pin a spot for its letter and label so that nothing overlaps.
export function placePinLabels(pins, plot, keepClear = []) {
  // Dots count as obstacles too, so a label never covers a dot
  const taken = [
    ...keepClear,
    ...pins.map((p) => ({ left: p.x - 7, right: p.x + 7, top: p.y - 7, bottom: p.y + 7 })),
  ];

  return pins.map((pin) => {
    // Preferred spot: right if there is room, else left; above if there is room, else below
    const sx = fitsAcross(labelRect(pin, 1, -1, plot), plot) ? 1 : -1;
    const sy = pin.y - plot.top > LABEL_H + GAP ? -1 : 1;

    // Try the preferred spot first, then flip up/down, then left/right, then both.
    // Take the first one that fits and overlaps nothing placed so far.
    const options = [[sx, sy], [sx, -sy], [-sx, sy], [-sx, -sy]];
    const [cx, cy] = options.find(([a, b]) => {
      const rect = labelRect(pin, a, b, plot);
      return fitsAcross(rect, plot) && !taken.some((t) => overlaps(rect, t));
    }) ?? options[0];

    const rect = labelRect(pin, cx, cy, plot);
    taken.push(rect);
    return {
      name: pin.name,
      text: pin.text,
      letterX: cx > 0 ? rect.left + LETTER_W / 2 : rect.right - LETTER_W / 2,
      boxLeft: cx > 0 ? rect.left + LETTER_W : rect.left,
      boxWidth: rect.right - rect.left - LETTER_W,
      centerY: (rect.top + rect.bottom) / 2,
    };
  });
}
