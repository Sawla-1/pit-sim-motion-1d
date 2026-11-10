/**
 * kinematics1d.js
 *
 * Pure 1D kinematics utilities for constant-acceleration motion.
 * No React, no recording state, no playback state — only physics math.
 */

/**
 * Calculate physics step for recording mode
 * Simple 1D kinematics with constant acceleration
 */
export function calculatePhysicsStep(simulation, deltaTime) {
  const newVelocity = simulation.velocity + simulation.acceleration * deltaTime;
  const avgVelocity = (simulation.velocity + newVelocity) / 2;
  const newPosition = simulation.position + avgVelocity * deltaTime;
  const newTime = simulation.time + deltaTime;

  return {
    position: newPosition,
    velocity: newVelocity,
    time: newTime,
    acceleration: simulation.acceleration,
  };
}

// Dragging the man (same idea as PhET's Moving Man): every frame takes one "photo"
// of where the mouse is, even when it stands still. The speed is how far the photos
// moved across the last DRAG_WINDOW seconds, so a little hand shake doesn't turn
// into huge velocity/acceleration spikes.
const DRAG_WINDOW = 0.06; // seconds looked back: about 4 frames at 60 fps
const MIN_SPAN = 0.03; // seconds; photos closer than this are too noisy for a speed
const SMOOTHING_TIME = 0.075; // seconds; new values ease in (0.2 per frame at 60 fps, same feel on any screen)

/**
 * One frame of drag motion (same clock as calculatePhysicsStep).
 * mouseX = where the mouse is now (meters).
 * photos = what this function returned last frame ([] when the drag starts),
 *   [{ x: meters, t: seconds, v: velocity then }], oldest first.
 * Returns { simulation, photos }; keep `photos` for the next frame.
 */
export function calculateDragStep(simulation, deltaTime, mouseX, photos) {
  const time = simulation.time + deltaTime;

  // This frame's photo, plus the ones from the last DRAG_WINDOW seconds
  // (at least 2, so one slow frame never leaves just one)
  const all = [...photos, { x: mouseX, t: time }];
  const recent = all.filter((photo) => photo.t >= time - DRAG_WINDOW);
  const kept = recent.length >= 2 ? recent : all.slice(-2);
  const oldest = kept[0];
  const newest = kept[kept.length - 1];
  const span = newest.t - oldest.t;

  // How much of the way to the new value to go this frame (0..1)
  const smoothing = 1 - Math.exp(-deltaTime / SMOOTHING_TIME);

  // Velocity: how far the mouse moved across the photos, eased in
  const rawVelocity = span >= MIN_SPAN ? (newest.x - oldest.x) / span : simulation.velocity;
  const velocity = simulation.velocity + smoothing * (rawVelocity - simulation.velocity);
  newest.v = velocity; // remembered, for the acceleration in later frames

  // Acceleration: how much the velocity changed across the same photos, eased in
  const rawAcceleration = span >= MIN_SPAN ? (velocity - oldest.v) / span : simulation.acceleration;
  const acceleration = simulation.acceleration + smoothing * (rawAcceleration - simulation.acceleration);

  // The man stands right under the mouse
  return { simulation: { position: newest.x, velocity, acceleration, time }, photos: kept };
}

