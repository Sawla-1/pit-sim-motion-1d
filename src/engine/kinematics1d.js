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
export function calculatePhysicsStep(simulation, deltaTime, realElapsedTime) {
  const newVelocity = simulation.velocity + simulation.acceleration * deltaTime;
  const avgVelocity = (simulation.velocity + newVelocity) / 2;
  const newPosition = simulation.position + avgVelocity * deltaTime;

  // Use real elapsed time for display, but keep physics consistent
  const newTime =
    realElapsedTime !== undefined
      ? realElapsedTime
      : simulation.time + deltaTime;

  return {
    position: newPosition,
    velocity: newVelocity,
    time: newTime,
    playing: simulation.playing,
    acceleration: simulation.acceleration,
  };
}
