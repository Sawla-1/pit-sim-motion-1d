/**
 * recordPlayback.js
 *
 * This file records the motion as it happens, and plays it back later.
 * It keeps the list of recorded points and works out what the simulation
 * should look like at any point in time.
 */

import { calculatePhysicsStep } from "./kinematics1d";

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

/**
 * One step of recording: move the simulation forward a bit, then
 * save that moment as a new point in the recorded history.
 */
export function handleRecordingStep(simulation, deltaTime) {
  const newSimulation = calculatePhysicsStep(simulation, deltaTime);

  return {
    simulation: newSimulation,
    recordedState: newSimulation,
  };
}

// ---------------------------------------------------------------------------
// Playback
//
// These four work together as one chain (the "playback engine"):
//
//   handlePlaybackStep  ─┐
//                         ├──> resolvePlaybackState ──> interpolateStateAtTime
//   handlePlaybackSeek  ─┘
//
// - interpolateStateAtTime does the actual math — finds the two nearest
//   recorded points and blends between them.
// - resolvePlaybackState wraps that with "stop at the end if we've gone
//   past the last recorded point."
// - handlePlaybackStep and handlePlaybackSeek both call
//   resolvePlaybackState — they're just two different doors into the same
//   logic (one for "advance a little bit each frame," one for "jump
//   straight to this time from a drag"). That's why they were split into
//   a shared function in the first place: without resolvePlaybackState,
//   step and seek would each need their own copy of the same lookup code.
// ---------------------------------------------------------------------------

/**
 * One step of normal playback: move playback time forward a bit,
 * then find the matching state. Called every frame while playing.
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
 * Jump playback straight to a chosen time. Called when the user drags
 * the timeline on the chart.
 */
export function handlePlaybackSeek(recordedData, targetTime) {
  const { simulation } = resolvePlaybackState(recordedData, targetTime);

  return {
    simulation,
    data: { playbackTime: simulation.time },
  };
}

/**
 * Get the simulation state at a chosen playback time. If that time is
 * past the last recorded point, it stays at the end instead of going
 * further. Both normal playback and dragging the chart to scrub use
 * this same function, so they always agree.
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
 * Work out what the simulation looked like at a time that wasn't
 * recorded exactly. Finds the two recorded points right before and
 * after that time (recordedData is sorted, so a binary search works),
 * then blends position and velocity between them. Acceleration is NOT
 * blended — it only changes when the user changes it, so it just uses
 * the earlier point's value instead of faking a smooth ramp.
 */
function interpolateStateAtTime(recordedData, targetTime) {
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
