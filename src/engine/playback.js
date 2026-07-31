/**
 * playback.js
 *
 * Record and playback utilities for the 1D kinematics simulation.
 * These functions manage the recorded data array and the playback state machine.
 */

import { calculatePhysicsStep } from "./kinematics1d";

/**
 * Find the recorded state at a given time, interpolating between the two
 * bracketing samples (binary search, since recordedData is time-sorted).
 * Position/velocity are continuous, so they're linearly interpolated.
 * Acceleration is a step function (only changes when the user edits the
 * control), so it's held at the earlier sample's value instead of being
 * blended into a fake ramp.
 */
export function interpolateStateAtTime(recordedData, targetTime) {
  if (recordedData.length === 1) return recordedData[0];

  let lo = 0;
  let hi = recordedData.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (recordedData[mid].time < targetTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const next = recordedData[lo];
  if (next.time <= targetTime) return next;

  const prev = recordedData[lo - 1];
  const t = (targetTime - prev.time) / (next.time - prev.time);

  return {
    time: targetTime,
    position: prev.position + (next.position - prev.position) * t,
    velocity: prev.velocity + (next.velocity - prev.velocity) * t,
    acceleration: prev.acceleration,
  };
}

/**
 * Resolve the simulation state at a target playback time, clamped to the
 * last recorded sample. Shared by both the delta-driven step (RAF loop)
 * and the absolute-time seek (chart drag-to-scrub).
 */
function resolvePlaybackState(recordedData, targetTime) {
  const maxTime =
    recordedData.length > 0 ? recordedData[recordedData.length - 1].time : 0;

  if (targetTime >= maxTime) {
    const lastState = recordedData[recordedData.length - 1];
    return { simulation: lastState, isEndOfPlayback: true };
  }

  const interpolated = interpolateStateAtTime(recordedData, targetTime);
  return { simulation: interpolated, isEndOfPlayback: false };
}

/**
 * Handle playback mode simulation step (delta-driven, called each RAF tick).
 */
export function handlePlaybackStep(data, deltaTime) {
  const newTime = data.playbackTime + deltaTime;
  const { simulation, isEndOfPlayback } = resolvePlaybackState(
    data.recordedData,
    newTime
  );

  return {
    simulation,
    data: { playbackTime: simulation.time },
    isEndOfPlayback,
  };
}

/**
 * Handle a seek to an absolute playback time (called from chart drag-scrub).
 */
export function handlePlaybackSeek(recordedData, targetTime) {
  const { simulation } = resolvePlaybackState(recordedData, targetTime);

  return {
    simulation,
    data: { playbackTime: simulation.time },
  };
}

/**
 * Handle recording mode simulation step
 */
export function handleRecordingStep(simulation, deltaTime) {
  const newSimulation = calculatePhysicsStep(simulation, deltaTime);

  // Create new recorded state
  const newRecordedState = {
    time: newSimulation.time,
    position: newSimulation.position,
    velocity: newSimulation.velocity,
    acceleration: simulation.acceleration,
  };

  return {
    simulation: newSimulation,
    recordedState: newRecordedState,
  };
}
