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
 * Handle playback mode simulation step
 */
export function handlePlaybackStep(data, deltaTime) {
  const newTime = data.playbackTime + deltaTime;
  const maxTime =
    data.recordedData.length > 0
      ? data.recordedData[data.recordedData.length - 1].time
      : 0;

  if (newTime >= maxTime) {
    // End of playback: stop at last recorded state
    const lastState = data.recordedData[data.recordedData.length - 1];
    return {
      simulation: {
        position: lastState.position,
        velocity: lastState.velocity,
        acceleration: lastState.acceleration,
        time: lastState.time,
      },
      data: {
        playbackTime: lastState.time,
      },
      isEndOfPlayback: true,
    };
  } else {
    // Interpolate the recorded state at current time
    const interpolated = interpolateStateAtTime(data.recordedData, newTime);
    return {
      simulation: {
        position: interpolated.position,
        velocity: interpolated.velocity,
        acceleration: interpolated.acceleration,
        time: interpolated.time,
      },
      data: {
        playbackTime: newTime,
      },
      isEndOfPlayback: false,
    };
  }
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
