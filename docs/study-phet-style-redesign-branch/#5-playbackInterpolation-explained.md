# Logic #5 Explained: `interpolateStateAtTime` / `resolvePlaybackState` / `handlePlaybackStep` / `handlePlaybackSeek`

File: `src/engine/recordPlayback.js:61-141`

## 1. What do these four functions do together?

### Quick Note

Together they're the "playback engine": given the `recordedData` array that #4 (`handleRecordingStep`) built during recording, they answer one question — "what did the simulation look like at time T?" — for any T, even times that fall *between* two recorded points.

### Answer

```js
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

export function handlePlaybackSeek(recordedData, targetTime) {
  const { simulation } = resolvePlaybackState(recordedData, targetTime);

  return {
    simulation,
    data: { playbackTime: simulation.time },
  };
}

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
```

Why split into four instead of one big function? Each piece has exactly one job:

| Function | Job |
|---|---|
| `interpolateStateAtTime` | The math — blend between two recorded points |
| `resolvePlaybackState` | The guard — "have we run off the end of the recording?" shared by both callers |
| `handlePlaybackStep` | Entry point for "advance a little bit" (called once per animation frame) |
| `handlePlaybackSeek` | Entry point for "jump straight to this time" (called when the user drags the chart timeline) |

All four are **pure functions** — same style as #1 (`calculatePhysicsStep`), #3 (`evaluateExpression`), and #4 (`handleRecordingStep`).

## 2. `interpolateStateAtTime` — the math

### Quick Note

`recordedData` only has points at whatever irregular real-time intervals recording actually ticked at — `useSimulationLoop.js` advances by real wall-clock delta each `requestAnimationFrame` call (roughly the monitor's refresh rate, e.g. ~16.7ms at 60Hz, but never perfectly even), not a fixed rate. If playback asks for a time that lands *between* two recorded points, this function finds the nearest recorded point before and after that time, then blends position and velocity proportionally between them.

### Answer

```js
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
```

There used to be a `recordedData.length === 1` guard at the top returning `recordedData[0]` directly, but it was dead code: `resolvePlaybackState` (below) always short-circuits before calling this function when there's only one recorded point, since that point's `time` is always `0`, making `maxTime = 0` and `targetTime >= maxTime` always true.

Two parts:

1. **Binary search** (`lo`/`hi`/`mid` loop) — `recordedData` is sorted by time (recording only ever appends), so instead of scanning every point one by one, it repeatedly halves the search range until `lo` points at the first recorded index whose time is `>= targetTime`. That index becomes `next`; the one right before it (`lo - 1`) is `prev`.
2. **Linear blend** — `t` is "how far between `prev` and `next`" the target time sits, as a fraction from `0` to `1`. `position` and `velocity` are each `prev + (next - prev) * t` — standard linear interpolation ("lerp").

### Subtlety: acceleration is NOT interpolated

Notice `acceleration: prev.acceleration` — not blended with `t` like position and velocity are. Acceleration is a **user-set input**, not something that changes continuously on its own (same idea as the acceleration subtlety in #4's doc: `calculatePhysicsStep` just passes it through unchanged). Between two recorded ticks, acceleration didn't "ease" from one value to another — it was whatever the user had set it to, held constant. So instead of faking a smooth ramp that never actually happened, this just copies `prev`'s acceleration straight through.

## 3. `resolvePlaybackState` — the end-of-data guard

### Quick Note

Playback shouldn't try to interpolate past the last thing that was ever recorded — this function checks for that first, and only calls the interpolation math if there's actually something to interpolate between.

### Answer

```js
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
```

- `maxTime` — the time of the very last recorded point (or `0` if nothing was recorded).
- If `targetTime` has reached or passed `maxTime`, there's nothing to interpolate — it short-circuits and returns the last recorded point directly, with `isEndOfPlayback: true`. `interpolateStateAtTime` never runs in this branch.
- Otherwise, it delegates to `interpolateStateAtTime` and reports `isEndOfPlayback: false`.

This is the one piece of logic that `handlePlaybackStep` and `handlePlaybackSeek` share — both call it instead of duplicating the "are we at the end?" check themselves.

## 4. `handlePlaybackStep` — per-frame tick entry

### Quick Note

This is the "advance a little bit" door — called once per animation frame while playback is running, the same way #4's `handleRecordingStep` is called once per frame while recording.

### Answer

```js
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
```

- **Inputs:** `data = { recordedData, playbackTime, ... }` and `deltaTime` (seconds elapsed since last frame).
- `newTime = data.playbackTime + deltaTime` — where playback *would* be after this tick.
- Hands `newTime` to `resolvePlaybackState` to get the actual state at (or clamped to) that time.
- **Output:** `{ simulation, data: { playbackTime }, isEndOfPlayback }` — note `data.playbackTime` is set from `simulation.time`, not from `newTime` directly. Near the end of the recording those two can differ (the guard clamps `simulation.time` to the last recorded time even if `newTime` overshot it), so reading it back off `simulation` keeps playback time from drifting past what was actually recorded.

## 5. `handlePlaybackSeek` — absolute-jump entry

### Quick Note

This is the "jump straight there" door — called when the user drags the timeline on a chart, not once per frame.

### Answer

```js
export function handlePlaybackSeek(recordedData, targetTime) {
  const { simulation } = resolvePlaybackState(recordedData, targetTime);

  return {
    simulation,
    data: { playbackTime: simulation.time },
  };
}
```

- **Inputs:** `recordedData` directly (no wrapping `data` object needed — a seek doesn't care what `playbackTime` currently is) and `targetTime` — the absolute time to jump to.
- Calls `resolvePlaybackState` with `targetTime` as-is — no `+ deltaTime` step, because a seek isn't "advance from where we are," it's "go here."
- **Output:** `{ simulation, data: { playbackTime } }` — no `isEndOfPlayback` in the return. A drag-scrub doesn't need to know "did this end playback?" the way the per-frame loop does (which uses it to stop the animation), so it's simply omitted.

Both `handlePlaybackStep` and `handlePlaybackSeek` funnel through the exact same `resolvePlaybackState` → `interpolateStateAtTime` lookup, which is the whole point of pulling that logic into a shared function: stepping frame-by-frame and dragging the chart always agree on what state a given time maps to.

## 6. Full numeric example

Setup: acceleration `2` m/s², one recording tick with a frame delta of `1/24` s (an example value — real frame deltas vary tick to tick with monitor refresh rate, they aren't a fixed 24 FPS). Take one recorded pair:

```js
const prev = { time: 1.0, position: 2.0, velocity: 3.0, acceleration: 2 };

// next = one recording tick later, via the same average-velocity kinematics as #1/#4:
// newVelocity = 3.0 + 2 × (1/24)              = 3.0833333
// avgVelocity = (3.0 + 3.0833333) / 2          = 3.0416667
// newPosition = 2.0 + 3.0416667 × (1/24)       = 2.1267361
// newTime     = 1.0 + 1/24                     = 1.0416667

const next = { time: 1.0416667, position: 2.1267361, velocity: 3.0833333, acceleration: 2 };

const recordedData = [prev, next];
```

### Trace: `handlePlaybackStep`

```js
handlePlaybackStep({ playbackTime: 1.0, recordedData }, 0.02)
```

1. `newTime = 1.0 + 0.02 = 1.02`
2. `resolvePlaybackState(recordedData, 1.02)`:
   - `maxTime = next.time = 1.0416667`
   - `1.02 >= 1.0416667` → **false** (1.02 is still inside the recording) → falls through to `interpolateStateAtTime`
3. `interpolateStateAtTime(recordedData, 1.02)`:
   - Binary search: `lo = 0, hi = 1` (length − 1)
     - `mid = (0 + 1) >> 1 = 0`; `recordedData[0].time` (`1.0`) `< 1.02` → true → `lo = 1`
     - loop ends (`lo === hi === 1`)
   - `next = recordedData[1]` (the `next` point above); `next.time (1.0416667) <= 1.02`? → false → continue
   - `prev = recordedData[0]` (the `prev` point above)
   - `t = (1.02 - 1.0) / (1.0416667 - 1.0) = 0.02 / 0.0416667 = 0.48`
   - `position = 2.0 + (2.1267361 - 2.0) × 0.48 = 2.0608333`
   - `velocity = 3.0 + (3.0833333 - 3.0) × 0.48 = 3.04`
   - `acceleration = prev.acceleration = 2` (copied, not blended)
   - → `{ time: 1.02, position: 2.0608333, velocity: 3.04, acceleration: 2 }`
4. `resolvePlaybackState` returns `{ simulation: <that object>, isEndOfPlayback: false }`
5. `handlePlaybackStep` returns:

```js
{
  simulation: { time: 1.02, position: 2.0608333, velocity: 3.04, acceleration: 2 },
  data: { playbackTime: 1.02 },
  isEndOfPlayback: false,
}
```

### Trace: `handlePlaybackSeek` — same target time, same result

```js
handlePlaybackSeek(recordedData, 1.02)
// resolvePlaybackState(recordedData, 1.02) walks the identical path as above
// → {
//     simulation: { time: 1.02, position: 2.0608333, velocity: 3.04, acceleration: 2 },
//     data: { playbackTime: 1.02 },
//   }
```

Same numbers as `handlePlaybackStep` — just no `+ deltaTime` beforehand, and no `isEndOfPlayback` in the return.

### Trace: end-of-data guard

```js
resolvePlaybackState(recordedData, 5.0)
```

- `maxTime = next.time = 1.0416667`
- `5.0 >= 1.0416667` → **true** → short-circuits
- returns `{ simulation: next, isEndOfPlayback: true }` — i.e. `{ time: 1.0416667, position: 2.1267361, velocity: 3.0833333, acceleration: 2 }`
- `interpolateStateAtTime` is **never called** in this case.

## 7. Why this matters for `useSimulationLoop.js` / `App.jsx`

### Quick Note

Same pattern as #4: these four functions only compute. Something else has to call them and actually update React state.

### Answer

- `useSimulationLoop.js` runs the `requestAnimationFrame` loop and calls `onPlaybackStep` once per frame while in playback mode — `App.jsx` wires this to `handlePlaybackStep`.
- `App.jsx` takes the returned `{ simulation, data, isEndOfPlayback }` and does the actual mutation: `setSimulation(simulation)`, merges `data.playbackTime` into `setData`, and uses `isEndOfPlayback` to stop the loop when playback reaches the end.
- `handlePlaybackSeek` isn't called from the animation loop at all — `Charts.jsx`'s drag-scrub handler calls `onSetPlaybackTime` (wired in `App.jsx`), which calls `handlePlaybackSeek` directly and applies the result the same way (`setSimulation` / `setData`).

Neither function touches React state or the DOM itself — they just compute `{ simulation, data, ... }` and hand it back. The caller one layer up decides what to do with it.

### Extra Tips

Per `logic-study-order.md`, #5 depends entirely on the `recordedData` array that #4 (`handleRecordingStep`) produces — there's nothing to interpolate without it. Next up is #6 (`useSimulationLoop.js`), the piece that actually drives both #4 and #5 by calling `onRecordStep` / `onPlaybackStep` once per animation frame.
