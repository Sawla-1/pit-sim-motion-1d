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
// These three work together as one chain (the "playback engine"):
//
//   handlePlaybackStep ──> resolvePlaybackState ──> interpolateStateAtTime
//
// - interpolateStateAtTime does the actual math — finds the two nearest
//   recorded points and blends between them.
// - resolvePlaybackState wraps that with "stop at the end if we've gone
//   past the last recorded point." A jump straight to a time (a drag on a
//   chart, the frame buttons) calls it directly.
// - handlePlaybackStep is the "advance a little bit each frame" door into
//   the same lookup, so playing and jumping always agree.
// ---------------------------------------------------------------------------

/**
 * One step of normal playback: move playback time forward a bit,
 * then find the matching state. Called every frame while playing.
 */
export function handlePlaybackStep(simulation, data, deltaTime) {
  const newTime = simulation.time + deltaTime;
  const { simulation: newSimulation, isEndOfPlayback } = resolvePlaybackState(
    data.recordedData,
    newTime
  );

  return {
    simulation: newSimulation,
    isEndOfPlayback,
  };
}

/**
 * Get the simulation state at a chosen playback time. If that time is
 * past the last recorded point, it stays at the end instead of going
 * further. Both normal playback and dragging the chart to scrub use
 * this same function, so they always agree.
 */
export function resolvePlaybackState(recordedData, targetTime) {
  const maxTime = recordedData[recordedData.length - 1].time;
   
  if (targetTime >= maxTime) {
    const lastState = recordedData[recordedData.length - 1];
    return { simulation: lastState, isEndOfPlayback: true };
  }

  const interpolated = interpolateStateAtTime(recordedData, targetTime);
  return { simulation: interpolated, isEndOfPlayback: false };
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

// ---------------------------------------------------------------------------
// Scrubbing by dragging the man (Playback)
// ---------------------------------------------------------------------------

// How close (meters) counts as "about the same spot", e.g. while he stands still
const SCRUB_TOLERANCE = 0.05;
// A shaky hand's wobble doesn't stop the slide: a step back of at most SCRUB_WOBBLE
// meters that lasts at most SCRUB_WOBBLE_TIME seconds. A real turn back is bigger or longer.
const SCRUB_WOBBLE = 0.2; // meters
const SCRUB_WOBBLE_TIME = 0.1; // seconds

// Index of the recorded point closest in time to `time`
function nearestIndex(recordedData, time) {
  const i = firstIndexAtOrAfter(recordedData, time);
  return i > 0 && time - recordedData[i - 1].time < recordedData[i].time - time ? i - 1 : i;
}

/**
 * Dragging the man in Playback: he slides along his own recorded path, like a
 * bead on a string, and time moves with him.
 * From `fromTime`, look later and earlier in the recording for the spot closest to
 * `targetPosition`, going only as far as he keeps getting closer (or stays about as
 * close). The closer side wins. If both are about as close (a turn-around point, or
 * standing still), keep going the way time was already going (`direction`: +1 later, -1 earlier).
 * Returns { time, direction }.
 */
export function findScrubTime(recordedData, fromTime, targetPosition, direction) {
  const distance = (i) => Math.abs(recordedData[i].position - targetPosition);
  const start = nearestIndex(recordedData, fromTime);

  // Walk one way while he gets closer or stays about as close; keep the closest point.
  // Stop when he is clearly farther, unless it is only a wobble.
  const walk = (step) => {
    let best = start;
    for (let i = start + step; i >= 0 && i < recordedData.length; i += step) {
      if (distance(i) < distance(best)) {
        best = i;
        continue;
      }
      const extra = distance(i) - distance(best); // how much farther than the closest so far
      const wobble = extra <= SCRUB_WOBBLE && Math.abs(recordedData[i].time - recordedData[best].time) <= SCRUB_WOBBLE_TIME;
      if (extra > SCRUB_TOLERANCE && !wobble) break;
    }
    return best;
  };
  const later = walk(1);
  const earlier = walk(-1);

  const gap = distance(later) - distance(earlier);
  const goLater = Math.abs(gap) <= SCRUB_TOLERANCE ? direction >= 0 : gap < 0;
  const index = goLater ? later : earlier;
  return { time: recordedData[index].time, direction: index === start ? direction : goLater ? 1 : -1 };
}
