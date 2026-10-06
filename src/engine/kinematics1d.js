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

// Same idea PhET's own Moving Man uses: average a few recent mouse readings
// instead of trusting the newest one outright, so small timing jitter doesn't
// turn into huge velocity/acceleration spikes.
export const NUMBER_MOUSE_POINTS_TO_AVERAGE = 4;

/**
 * Calculate one step of drag-driven motion, called once per animation frame
 * (same clock as calculatePhysicsStep) — not once per raw mouse event.
 *
 * `samples` is a short rolling history of recent raw mouse readings,
 * each { x: positionInMeters, t: wallClockMs }, oldest first.
 */
export function calculateDragStep(simulation, deltaTime, samples) {
  const time = simulation.time + deltaTime;

  if (!samples || samples.length === 0) {
    return { position: simulation.position, velocity: simulation.velocity, acceleration: simulation.acceleration, time };
  }

  // Smoothed position: the average of the recent raw readings.
  const position = samples.reduce((sum, s) => sum + s.x, 0) / samples.length;

  // Velocity/acceleration from the span of the whole window (oldest to newest),
  // not just the latest two readings — a wider time baseline is far less
  // sensitive to a single mouse event landing a few milliseconds off.
  const oldest = samples[0];
  const newest = samples[samples.length - 1];
  const span = (newest.t - oldest.t) / 1000;

  const velocity = span > 0 ? (newest.x - oldest.x) / span : simulation.velocity;
  const acceleration = span > 0 ? (velocity - simulation.velocity) / span : 0;

  return { position, velocity, acceleration, time };
}

