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
