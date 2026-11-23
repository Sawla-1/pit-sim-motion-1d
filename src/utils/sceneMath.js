import { niceStep } from "./niceStep";

// Turns the scene's "world units" into pixels. The ruler is 20 world units wide.
export const EDGE = 10; // half-width of the ruler picture in world units; the picture never changes size
export const MIN_RANGE = 10; // meters shown on each side of 0 while the man is near the middle
const MAX_LABELS_PER_SIDE = 6;
const COMPACT_LABELS_PER_SIDE = 2; // a short ruler: -10, -5, 0, 5, 10
const COMPACT_RULER_PX = 450; // a ruler narrower than this on screen (a phone held upright) is short
const MIN_EDGE_GAP = 0.2; // world units; any closer and the edge stick doubles up with the last stick
export const EDGE_LABEL_GAP = 0.8; // world units; a regular label closer than this to the edge label would overlap it, so it is hidden
export const GROUND_Y = -0.6; // height of the ground line; the man's and the pins' feet stand on it
const FIT_HALF_WIDTH = 11; // ruler ±10 plus room for the man sprite and the edge label
export const PIN_FLAG_HEIGHT = 0.36;
const CONTENT_BOTTOM = -1.25; // just below the ruler labels (when they are LABEL_REFERENCE tall)
const BOTTOM_GAP = 2; // px between the numbers and the scene's bottom edge, when the content sits at the bottom
const TOP_GAP = 4; // px kept free above the pin flags when the content sits at the bottom (the time box is there)

export const LABEL_BASE = 0.3; // world units: the ruler number size on big screens
const LABEL_MIN_PX = 13; // the ruler numbers are never smaller than this on screen
const LABEL_REFERENCE = 0.25; // the number size that CONTENT_BOTTOM was made for

// How tall a ruler number is on screen (px), when one world unit is pixelsPerUnit px.
// base = its size in world units (a thicker ruler has bigger numbers); minPx / maxPx = the smallest
// and biggest size on screen.
function labelPx(pixelsPerUnit, { base = LABEL_BASE, minPx = LABEL_MIN_PX, maxPx = Infinity } = {}) {
  return Math.min(maxPx, Math.max(base * pixelsPerUnit, minPx));
}

// A short ruler on screen (a phone held upright) gets fewer numbers and a bigger man
export function isCompactRuler(rulerWidth) {
  return rulerWidth < COMPACT_RULER_PX;
}

// Pixels per world unit when the ruler fills rulerWidth px (a wide man still fits at its ends)
export function rulerZoom(rulerWidth, manWidth) {
  return rulerWidth / (2 * Math.max(FIT_HALF_WIDTH, EDGE + manWidth / 2));
}

// The ruler sticks for a ruler that shows -range..range meters (compact: fewer numbers).
// ticks = [{ value (meters), labeled }]: a long stick with a number every `step`,
// and a short stick halfway between. showEdge = the ruler's last stick falls short
// of the picture's edge, so draw an extra end mark there.
export function makeRulerTicks(range, compact) {
  const halfStep = niceStep(range, compact ? COMPACT_LABELS_PER_SIDE : MAX_LABELS_PER_SIDE) / 2;
  const halfSteps = Math.floor(range / halfStep); // how many halfSteps fit from 0 to the edge
  const ticks = Array.from({ length: halfSteps * 2 + 1 }, (_, i) => {
    const n = i - halfSteps;
    return { value: n * halfStep, labeled: n % 2 === 0 };
  });
  const showEdge = ((range - halfSteps * halfStep) / range) * EDGE > MIN_EDGE_GAP;
  return { ticks, showEdge };
}

// The top of the pin flags and the bottom of the ruler numbers (world units).
// extraBottom = how much lower the numbers hang than usual (a thicker ruler); flagHeight = the pin flags' height
function contentTopBottom(labelSize, manHeight, extraBottom, flagHeight) {
  const top = GROUND_Y + manHeight + flagHeight; // top of the pin flags (the pole is as tall as the man)
  const bottom = CONTENT_BOTTOM - (labelSize - LABEL_REFERENCE) - extraBottom; // room for taller numbers
  return { top, bottom };
}

// Makes the ruler, the pins and the man fit inside the scene on any screen size.
// Returns the zoom (pixels per world unit), the ruler number size, the world→pixel functions, and
// roomAbove: the room from the ground line up to the top of the scene (world units).
// World: 0 is the centre, y goes UP. Pixels: y goes DOWN, so toY flips it.
// manHeight, flagHeight = the man and the pin flags at their normal size: the zoom always makes room
// for them, so the ruler keeps its size (a bigger man must fit in roomAbove).
// manWidth = the man's width as drawn. labelMinPx / labelMaxPx = the smallest and biggest ruler
// number (px); labelBase = the number size on big screens (world units); extraBottom: see
// contentTopBottom; alignBottom = put the content at the bottom of the scene (the room left over
// goes above it, and TOP_GAP stays free at the top).
export function makeSceneView(width, height, manHeight, { manWidth = 0, labelMinPx = LABEL_MIN_PX, labelMaxPx, labelBase = LABEL_BASE, extraBottom = 0, flagHeight = PIN_FLAG_HEIGHT, alignBottom = false } = {}) {
  const widthZoom = rulerZoom(width, manWidth); // the ruler fits the width
  const labelSize = labelPx(widthZoom, { base: labelBase, minPx: labelMinPx, maxPx: labelMaxPx }) / widthZoom; // world units
  const { top, bottom } = contentTopBottom(labelSize, manHeight, extraBottom, flagHeight);
  const topGap = alignBottom ? TOP_GAP : 0;
  const bottomGap = alignBottom ? BOTTOM_GAP : 0;
  const zoom = Math.min(widthZoom, (height - topGap - bottomGap) / (top - bottom)); // pixels per world unit
  const centerY = (top + bottom) / 2; // the content sits below y=0, so centre on it
  const toY = alignBottom
    ? (worldY) => height - BOTTOM_GAP - (worldY - bottom) * zoom
    : (worldY) => height / 2 - (worldY - centerY) * zoom;

  return {
    zoom,
    labelSize,
    roomAbove: (toY(GROUND_Y) - topGap) / zoom,
    toX: (worldX) => width / 2 + worldX * zoom,
    toY,
  };
}

// Like makeSceneView, but the ground line stands on a backdrop picture that covers the scene
// (object-fit: cover, pinned to the bottom). So the man is on the same spot of the picture on
// every screen. backdrop = { width, height, groundUp }: the picture's size, and how high above
// its bottom edge the ground goes (in the picture's own pixels). side = room kept free at the
// left and right (px), for example for the bamboo. numbersLikeCharts: see labelZoom below.
// manHeight, manWidth, flagHeight, the label options, extraBottom, alignBottom, and what it returns: see makeSceneView.
export function makeBackdropView(width, height, { manHeight, manWidth, backdrop, side, numbersLikeCharts = false, labelMinPx = LABEL_MIN_PX, labelMaxPx, labelBase = LABEL_BASE, extraBottom = 0, flagHeight = PIN_FLAG_HEIGHT, alignBottom = false }) {
  const rulerWidth = width - 2 * side;
  const widthZoom = rulerZoom(rulerWidth, manWidth); // the ruler fits between the sides
  // numbersLikeCharts: the numbers are as big as on the Charts tab, which uses the whole width (here
  // the bamboo at the sides and the wide man make the ruler shorter, but not the numbers)
  const labelZoom = numbersLikeCharts ? width / (2 * FIT_HALF_WIDTH) : widthZoom;
  const labelSize = labelPx(labelZoom, { base: labelBase, minPx: labelMinPx, maxPx: labelMaxPx }) / widthZoom; // world units
  const { top, bottom } = contentTopBottom(labelSize, manHeight, extraBottom, flagHeight);
  const topGap = alignBottom ? TOP_GAP : 0;
  let zoom, groundPx; // groundPx = the ground line, from the top
  if (alignBottom) {
    // The ruler near the scene's bottom (not on the picture's spot): everything fits above it
    zoom = Math.min(widthZoom, (height - BOTTOM_GAP - topGap) / (top - bottom));
    groundPx = height - BOTTOM_GAP - (GROUND_Y - bottom) * zoom;
  } else {
    const scale = Math.max(width / backdrop.width, height / backdrop.height); // as object-fit: cover
    groundPx = height - backdrop.groundUp * scale;
    zoom = Math.min(
      widthZoom,
      groundPx / (top - GROUND_Y), // the man and the pin flags fit above the ground
      (height - groundPx) / (GROUND_Y - bottom), // the numbers fit below it
    );
  }

  return {
    zoom,
    labelSize,
    roomAbove: (groundPx - topGap) / zoom,
    toX: (worldX) => width / 2 + worldX * zoom,
    toY: (worldY) => groundPx - (worldY - GROUND_Y) * zoom,
  };
}
