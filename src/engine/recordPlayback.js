/**
 * recordPlayback.js
 *
 * This file plays a recording back. From the list of recorded points it
 * works out what the simulation should look like at any point in time.
 * (Recording itself is simple: the loop adds each new state to the list.)
 */

// ---------------------------------------------------------------------------
// Playback
//
// These two work together (the "playback engine"):
//
//   resolvePlaybackState ──> interpolateStateAtTime
//
// - interpolateStateAtTime does the actual math — finds the two nearest
//   recorded points and blends between them.
// - resolvePlaybackState wraps that with "stop at the end if we've gone
//   past the last recorded point." Playing (a little further each frame)
//   and jumping (a drag on a chart, the frame buttons) both call it, so
//   they always agree.
// ---------------------------------------------------------------------------

/**
 * Get the simulation state at a chosen playback time. If that time is
 * past the last recorded point, it stays at the end instead of going
 * further. Both normal playback and dragging the chart to scrub use
 * this same function, so they always agree.
 */
export function resolvePlaybackState(recordedData, targetTime) {
  const lastState = recordedData[recordedData.length - 1];
  if (targetTime >= lastState.time) return { simulation: lastState, isEndOfPlayback: true };
  return { simulation: interpolateStateAtTime(recordedData, targetTime), isEndOfPlayback: false };
}

/**
 * First recorded point whose time is at or after `time` (the last point if
 * none is). recordedData is sorted by time, so a binary search works.
 */
function firstIndexAtOrAfter(recordedData, time) {
  let lo = 0;
  let hi = recordedData.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (recordedData[mid].time < time) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
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
  const lo = firstIndexAtOrAfter(recordedData, targetTime);
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
