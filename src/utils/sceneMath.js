// Turns the scene's "world units" into pixels. The numbers are the ones the old
// 3D scene used (the ruler is 20 units wide), so the picture looks the same.
export const GROUND_Y = -0.6; // height of the ground line; the man's and the pins' feet stand on it
export const FIT_HALF_WIDTH = 11; // ruler ±10 plus room for the man sprite and the edge label
export const PIN_FLAG_HEIGHT = 0.36;
const CONTENT_BOTTOM = -1.25; // just below the ruler labels (when they are LABEL_REFERENCE tall)

const LABEL_BASE = 0.3; // world units: the ruler number size on big screens
const LABEL_MIN_PX = 13; // the ruler numbers are never smaller than this on screen
const LABEL_REFERENCE = 0.25; // the number size that CONTENT_BOTTOM was made for

// How tall a ruler number is, in world units, for a scene this wide (px)
export function labelFontSize(sceneWidth) {
  const pixelsPerUnit = sceneWidth / (2 * FIT_HALF_WIDTH);
  return Math.max(LABEL_BASE, LABEL_MIN_PX / pixelsPerUnit);
}

// Makes the ruler, the pins and the man fit inside the scene on any screen size.
// Returns the world→pixel functions and the world height of what must be visible.
// World: 0 is the centre, y goes UP. Pixels: y goes DOWN, so toY flips it.
export function makeSceneView(width, height, manHeight) {
  const top = GROUND_Y + manHeight + PIN_FLAG_HEIGHT; // top of the pin flags (the pole is as tall as the man)
  const bottom = CONTENT_BOTTOM - (labelFontSize(width) - LABEL_REFERENCE); // room for taller numbers
  const centerY = (top + bottom) / 2; // the content sits below y=0, so centre on it
  const zoom = Math.min(width / (2 * FIT_HALF_WIDTH), height / (top - bottom)); // pixels per world unit

  return {
    zoom,
    top,
    bottom,
    toX: (worldX) => width / 2 + worldX * zoom,
    toY: (worldY) => height / 2 - (worldY - centerY) * zoom,
  };
}
