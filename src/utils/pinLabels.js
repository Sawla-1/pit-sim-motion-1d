const GAP = 14; // space between the dot and its label
const LETTER_W = 18; // room for the big letter (A / B)
const LABEL_H = 28;
const HIDE_BUTTON = 72; // space kept clear at the right end of the plot

// Rough width of the label box (about 7px per character, same as before)
const labelWidth = (text) => text.length * 7 + 12;

// The rectangle that the letter + label fill.
// sx: 1 = right of the dot, -1 = left.  sy: -1 = above, 1 = below.
function labelRect(pin, sx, sy) {
  const width = LETTER_W + labelWidth(pin.text);
  const left = sx > 0 ? pin.x + GAP : pin.x - GAP - width;
  const top = pin.y + sy * (GAP + LABEL_H / 2) - LABEL_H / 2;
  return { left, top, right: left + width, bottom: top + LABEL_H };
}

const overlaps = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Must stay inside the plot (and away from the hide button on the right)
function fits(rect, sx, plot) {
  const rightLimit = sx > 0 ? plot.right - HIDE_BUTTON : plot.right;
  return rect.left >= plot.left && rect.right <= rightLimit &&
         rect.top >= plot.top && rect.bottom <= plot.bottom;
}

// pins = [{ name, x, y, text }] in pixels; plot = { left, right, top, bottom }.
// Gives each pin a spot for its letter and label so that nothing overlaps.
export function placePinLabels(pins, plot) {
  // Dots count as obstacles too, so a label never covers a dot
  const taken = pins.map((p) => ({ left: p.x - 7, right: p.x + 7, top: p.y - 7, bottom: p.y + 7 }));

  return pins.map((pin) => {
    // Preferred spot (same rule as before): right if there is room, else left;
    // above if there is room, else below
    const sx = fits(labelRect(pin, 1, -1), 1, { ...plot, top: -Infinity, bottom: Infinity }) ? 1 : -1;
    const sy = pin.y - plot.top > LABEL_H + GAP ? -1 : 1;

    // Try the preferred spot first, then flip up/down, then left/right, then both.
    // Take the first one that fits and overlaps nothing placed so far.
    const options = [[sx, sy], [sx, -sy], [-sx, sy], [-sx, -sy]];
    const [cx, cy] = options.find(([a, b]) => {
      const rect = labelRect(pin, a, b);
      return fits(rect, a, plot) && !taken.some((t) => overlaps(rect, t));
    }) ?? options[0];

    const rect = labelRect(pin, cx, cy);
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
