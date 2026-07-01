/**
 * playback.js
 *
 * Record and playback utilities for the 1D kinematics simulation.
 * These functions manage the recorded data array and the playback state machine.
 */

import { calculatePhysicsStep } from "./kinematics1d";

/**
 * Find the closest recorded state to a given time
 */
export function findClosestState(recordedData, targetTime) {
  let closest = recordedData[0];
  for (let i = 0; i < recordedData.length; i++) {
    const state = recordedData[i];
    if (
      Math.abs(state.time - targetTime) < Math.abs(closest.time - targetTime)
    ) {
      closest = state;
    }
  }
  return closest;
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
    // Find closest recorded state to current time
    const closest = findClosestState(data.recordedData, newTime);
    return {
      simulation: {
        position: closest.position,
        velocity: closest.velocity,
        acceleration: closest.acceleration,
        time: newTime,
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
export function handleRecordingStep(simulation, deltaTime, realElapsedTime) {
  const newSimulation = calculatePhysicsStep(
    simulation,
    deltaTime,
    realElapsedTime
  );

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
