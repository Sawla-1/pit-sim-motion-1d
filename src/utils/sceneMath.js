import { niceStep } from "./niceStep";

// Turns the scene's "world units" into pixels. The ruler is 20 world units wide.
export const EDGE = 10; // half-width of the ruler picture in world units; the picture never changes size
export const MIN_RANGE = 10; // meters shown on each side of 0 while the man is near the middle
const MAX_LABELS_PER_SIDE = 6;
const MIN_EDGE_GAP = 0.2; // world units; any closer and the edge stick doubles up with the last stick
export const EDGE_LABEL_GAP = 0.8; // world units; a regular label closer than this to the edge label would overlap it, so it is hidden
export const GROUND_Y = -0.6; // height of the ground line; the man's and the pins' feet stand on it
const FIT_HALF_WIDTH = 11; // ruler ±10 plus room for the man sprite and the edge label
export const PIN_FLAG_HEIGHT = 0.36;
const CONTENT_BOTTOM = -1.25; // just below the ruler labels (when they are LABEL_REFERENCE tall)

export const LABEL_BASE = 0.3; // world units: the ruler number size on big screens
const LABEL_MIN_PX = 13; // the ruler numbers are never smaller than this on screen
const LABEL_REFERENCE = 0.25; // the number size that CONTENT_BOTTOM was made for

// How tall a ruler number is, in world units, for a scene this wide (px)
export function labelFontSize(sceneWidth) {
  const pixelsPerUnit = sceneWidth / (2 * FIT_HALF_WIDTH);
  return Math.max(LABEL_BASE, LABEL_MIN_PX / pixelsPerUnit);
}

// The ruler sticks for a ruler that shows -range..range meters.
// ticks = [{ value (meters), labeled }]: a long stick with a number every `step`,
// and a short stick halfway between. showEdge = the ruler's last stick falls short
// of the picture's edge, so draw an extra end mark there.
export function makeRulerTicks(range) {
  const halfStep = niceStep(range, MAX_LABELS_PER_SIDE) / 2;
  const halfSteps = Math.floor(range / halfStep); // how many halfSteps fit from 0 to the edge
  const ticks = Array.from({ length: halfSteps * 2 + 1 }, (_, i) => {
    const n = i - halfSteps;
    return { value: n * halfStep, labeled: n % 2 === 0 };
  });
  const showEdge = ((range - halfSteps * halfStep) / range) * EDGE > MIN_EDGE_GAP;
  return { ticks, showEdge };
}

// Makes the ruler, the pins and the man fit inside the scene on any screen size.
// Returns the zoom (pixels per world unit) and the world→pixel functions.
// World: 0 is the centre, y goes UP. Pixels: y goes DOWN, so toY flips it.
export function makeSceneView(width, height, manHeight) {
  const top = GROUND_Y + manHeight + PIN_FLAG_HEIGHT; // top of the pin flags (the pole is as tall as the man)
  const bottom = CONTENT_BOTTOM - (labelFontSize(width) - LABEL_REFERENCE); // room for taller numbers
  const centerY = (top + bottom) / 2; // the content sits below y=0, so centre on it
  const zoom = Math.min(width / (2 * FIT_HALF_WIDTH), height / (top - bottom)); // pixels per world unit

  return {
    zoom,
    toX: (worldX) => width / 2 + worldX * zoom,
    toY: (worldY) => height / 2 - (worldY - centerY) * zoom,
  };
}
