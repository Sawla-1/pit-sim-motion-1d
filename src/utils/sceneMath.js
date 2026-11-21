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

export const LABEL_BASE = 0.3; // world units: the ruler number size on big screens
const LABEL_MIN_PX = 13; // the ruler numbers are never smaller than this on screen
const LABEL_REFERENCE = 0.25; // the number size that CONTENT_BOTTOM was made for

// How tall a ruler number is, in world units, for a scene this wide (px). minPx = the smallest
// size on screen; fitHalfWidth = the world units that fit from the centre to each side.
function labelFontSize(sceneWidth, minPx = LABEL_MIN_PX, fitHalfWidth = FIT_HALF_WIDTH) {
  const pixelsPerUnit = sceneWidth / (2 * fitHalfWidth);
  return Math.max(LABEL_BASE, minPx / pixelsPerUnit);
}

// A short ruler on screen (a phone held upright) gets fewer numbers and a bigger man
export function isCompactRuler(rulerWidth) {
  return rulerWidth < COMPACT_RULER_PX;
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

// The top of the pin flags and the bottom of the ruler numbers (world units)
function contentTopBottom(labelSize, manHeight) {
  const top = GROUND_Y + manHeight + PIN_FLAG_HEIGHT; // top of the pin flags (the pole is as tall as the man)
  const bottom = CONTENT_BOTTOM - (labelSize - LABEL_REFERENCE); // room for taller numbers
  return { top, bottom };
}

// Makes the ruler, the pins and the man fit inside the scene on any screen size.
// Returns the zoom (pixels per world unit), the ruler number size and the world→pixel functions.
// World: 0 is the centre, y goes UP. Pixels: y goes DOWN, so toY flips it.
export function makeSceneView(width, height, manHeight) {
  const labelSize = labelFontSize(width);
  const { top, bottom } = contentTopBottom(labelSize, manHeight);
  const centerY = (top + bottom) / 2; // the content sits below y=0, so centre on it
  const zoom = Math.min(width / (2 * FIT_HALF_WIDTH), height / (top - bottom)); // pixels per world unit

  return {
    zoom,
    labelSize,
    toX: (worldX) => width / 2 + worldX * zoom,
    toY: (worldY) => height / 2 - (worldY - centerY) * zoom,
  };
}

// Like makeSceneView, but the ground line stands on a backdrop picture that covers the scene
// (object-fit: cover, pinned to the bottom). So the man is on the same spot of the picture on
// every screen. backdrop = { width, height, groundUp }: the picture's size, and how high above
// its bottom edge the ground goes (in the picture's own pixels). side = room kept free at the
// left and right (px), for example for the bamboo. labelMinPx = the smallest ruler number (px).
export function makeBackdropView(width, height, { manHeight, manWidth, backdrop, side, labelMinPx = LABEL_MIN_PX }) {
  const scale = Math.max(width / backdrop.width, height / backdrop.height); // as object-fit: cover
  const groundPx = height - backdrop.groundUp * scale; // from the top
  const rulerWidth = width - 2 * side;
  const fitHalfWidth = Math.max(FIT_HALF_WIDTH, EDGE + manWidth / 2); // a wide man still fits at the ruler's ends
  const labelSize = labelFontSize(rulerWidth, labelMinPx, fitHalfWidth);
  const { top, bottom } = contentTopBottom(labelSize, manHeight);
  const zoom = Math.min(
    rulerWidth / (2 * fitHalfWidth), // the ruler fits between the sides
    groundPx / (top - GROUND_Y), // the man and the pin flags fit above the ground
    (height - groundPx) / (GROUND_Y - bottom), // the numbers fit below it
  );

  return {
    zoom,
    labelSize,
    toX: (worldX) => width / 2 + worldX * zoom,
    toY: (worldY) => groundPx - (worldY - GROUND_Y) * zoom,
  };
}
