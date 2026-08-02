# Logic #6 Explained: `useSimulationLoop`

File: `src/hooks/useSimulationLoop.js:1-77`

## 1. What does `useSimulationLoop` do overall?

### Quick Note

It's the heartbeat of the app: a `requestAnimationFrame` (RAF) loop that ticks every frame, and each tick decides whether to call #4 (`handleRecordingStep`) or #5 (`handlePlaybackStep`) depending on what mode you're in.

### Answer

```js
export function useSimulationLoop({
  playing,
  simulation,
  data,
  setSimulation,
  setData,
  setPlaying,
  onRecordStep,
  onPlaybackStep,
}) {
```

- It's a **hook**, not a pure function — it owns refs and effects, unlike #1/#3/#4/#5.
- It doesn't know any physics. It never imports `calculatePhysicsStep` or `interpolateStateAtTime` — it only calls whichever callback was handed to it (`onRecordStep`, `onPlaybackStep`).
- It's **PhET-style real-delta**: each tick advances by the actual wall-clock gap since the last frame, not a fixed step size. That's why `frameTime` is computed from `performance.now()` timestamps rather than a constant like `1/60`.

## 2. The refs — `last`, `simulationRef`, `dataRef`

### Quick Note

The RAF loop is set up once inside a `useEffect`, but `simulation` and `data` change on every render. Refs are how the loop reads *fresh* values without having to tear down and recreate the loop every render.

### Answer

```js
const last = useRef(performance.now());

const simulationRef = useRef(simulation);
simulationRef.current = simulation;
const dataRef = useRef(data);
dataRef.current = data;
```

- `last` — the `performance.now()` timestamp of the previous frame, used to compute `frameTime`.
- `simulationRef` / `dataRef` — mirror the latest `simulation` / `data` props into a ref on *every render* (the two assignment lines run unconditionally, no `useEffect` needed for that part).

### Subtlety: the stale closure problem

The RAF loop itself lives inside a `useEffect` with a dependency array (`[playing, setSimulation, setData, setPlaying, onRecordStep, onPlaybackStep]`). That effect — and the `loop` function closure it creates — only re-runs when one of *those* values changes, **not** on every render. If `loop` read `simulation` or `data` directly (instead of through a ref), it would keep using whatever `simulation`/`data` looked like at the moment the effect last ran, even after several more renders had produced newer values. That's a **stale closure**: the closure "remembers" old props forever until the effect deps force a re-run.

Refs sidestep this because `simulationRef.current = simulation` runs on every render regardless of whether the effect re-runs. So `loop` can close over `simulationRef` once, and just read `simulationRef.current` each frame to always get the latest value — no need to rebuild the whole RAF loop on every physics update.

## 3. The visibilitychange effect — auto-pause on tab hide

### Quick Note

If you switch tabs while the sim is running, this pauses it and resets the clock — so coming back doesn't dump one giant catch-up jump into the physics.

### Answer

```js
useEffect(() => {
  function handleVisibilityChange() {
    if (document.hidden) {
      setPlaying(false);
      last.current = performance.now();
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () =>
    document.removeEventListener("visibilitychange", handleVisibilityChange);
}, [setPlaying]);
```

- Listens for the browser's `visibilitychange` event, which fires when the tab is hidden or shown.
- On hide: `setPlaying(false)` stops physics from advancing, and `last.current = performance.now()` resets the frame-delta anchor to "now."

### Subtlety: why reset `last.current` at all?

Without the reset, imagine the user hides the tab for 5 minutes, then comes back. RAF callbacks don't fire while a tab is backgrounded, but the *next* one that does fire computes `frameTime = (now - last.current) / 1000` — and `last.current` would still be from 5 minutes ago. That would compute a ~300 second `frameTime`. The `MAX_FRAME_TIME` clamp (section 4) would cap it at `0.1s` regardless, so it's not strictly necessary for correctness — but resetting `last.current` here is what makes `playing` and the timing anchor go stale *together*, rather than leaving a huge stale gap sitting around unused until the next play press.

## 4. `frameTime` computation and the `MAX_FRAME_TIME` clamp

### Quick Note

Every tick measures how much real time passed since the last tick, and caps it so one slow/stalled frame can't inject a huge physics jump.

### Answer

```js
const MAX_FRAME_TIME = 0.1; // seconds; caps the delta from a stalled frame

function loop(now) {
  const frameTime = Math.min((now - last.current) / 1000, MAX_FRAME_TIME);
  last.current = now;
  ...
}
```

- `now` is the timestamp RAF passes in (same clock as `performance.now()`).
- `(now - last.current) / 1000` — milliseconds since the last tick, converted to seconds.
- `Math.min(..., MAX_FRAME_TIME)` — clamped to `0.1s`. At a normal 60 FPS, `frameTime` is ~`0.01667s` — nowhere near the clamp. The clamp only kicks in if a frame stalls (e.g. the browser was busy, or a debugger paused execution) so the physics can't take one enormous leap forward.
- `last.current = now` updates the anchor immediately, regardless of `playing` — so the *next* frame's delta is measured correctly whether or not this frame actually did any physics.

## 5. The `playing` guard and why RAF always reschedules

### Quick Note

`playing` only gates whether physics runs this tick — it never gates whether the loop keeps going.

### Answer

```js
function loop(now) {
  const frameTime = Math.min((now - last.current) / 1000, MAX_FRAME_TIME);
  last.current = now;

  if (playing) {
    // ...dispatch to onRecordStep or onPlaybackStep...
  }
  raf = requestAnimationFrame(loop);
}
raf = requestAnimationFrame(loop);
return () => cancelAnimationFrame(raf);
```

- `if (playing) { ... }` wraps only the physics dispatch. When paused, the block is skipped entirely — `simulation.time` doesn't advance because nothing calls `onRecordStep`/`onPlaybackStep` to add `frameTime` to it (see CLAUDE.md: "Recording time is simply `simulation.time + frameTime` each tick... pausing just stops adding to it").
- `raf = requestAnimationFrame(loop)` is called **unconditionally**, outside the `if`. The loop keeps rescheduling itself every frame whether playing or paused — that's what lets a later `setPlaying(true)` resume immediately without needing to restart the RAF chain.
- `return () => cancelAnimationFrame(raf)` — the effect's cleanup, runs when the effect re-runs (deps changed) or the component unmounts, so there's never more than one RAF chain alive at once.

## 6. Dispatch: `onPlaybackStep` (#5) vs `onRecordStep` (#4)

### Quick Note

Each playing tick picks exactly one of two doors, based on `data.selectedMode` — mirroring the branch CLAUDE.md describes in "Data flow."

### Answer

```js
const dat = dataRef.current;

if (dat.selectedMode === "playback" && dat.recordedData.length > 1) {
  // PLAYBACK MODE
  const result = onPlaybackStep(dat, frameTime);
  setSimulation(result.simulation);
  setData((prev) => ({ ...prev, ...result.data }));
  if (result.isEndOfPlayback) setPlaying(false);
} else {
  // RECORDING MODE
  const result = onRecordStep(sim, frameTime);
  setSimulation(result.simulation);
  setData((prev) => ({
    ...prev,
    recordedData: [...prev.recordedData, result.recordedState],
  }));
  if (result.simulation.time >= MAX_RECORD_TIME) {
    setPlaying(false);
  }
}
```

| Condition | Branch | Calls | Applies result via |
|---|---|---|---|
| `selectedMode === "playback"` **and** `recordedData.length > 1` | Playback | `onPlaybackStep(dat, frameTime)` (→ #5's `handlePlaybackStep`) | `setSimulation`, merge `result.data` into `data`, stop if `isEndOfPlayback` |
| anything else | Recording | `onRecordStep(sim, frameTime)` (→ #4's `handleRecordingStep`) | `setSimulation`, append `result.recordedState` to `recordedData`, stop if `MAX_RECORD_TIME` reached |

- The `recordedData.length > 1` guard matters: #5's `interpolateStateAtTime` needs at least two points to interpolate between. With 0 or 1 recorded points, playback would have nothing to play — so it falls through to the recording branch instead (harmless, since with no meaningful recording there's nothing destructive about that path running).
- `MAX_RECORD_TIME = 600` (10 minutes) auto-pauses recording so `recordedData` can't grow unbounded if a user just leaves it running.
- Both branches call `setSimulation` and update `data`, but the *shape* of the `data` update differs: playback merges `{ playbackTime }`, recording appends to `recordedData`.

## 7. Full numeric example — RECORDING mode

Setup: `acceleration = 2`, starting at rest (`velocity = 0, position = 0, time = 0`), 60 FPS RAF ticks ~16.667ms apart: `now = 1000.0 → 1016.667 → 1033.333 → 1050.0`.

### Tick 1 — `now = 1016.667`

```
frameTime = (1016.667 - 1000.0) / 1000 = 0.016667   (under MAX_FRAME_TIME, no clamp)
last.current = 1016.667

onRecordStep({ position: 0, velocity: 0, acceleration: 2, time: 0 }, 0.016667)
  newVelocity = 0 + 2 × 0.016667       = 0.033333
  avgVelocity = (0 + 0.033333) / 2     = 0.016667
  newPosition = 0 + 0.016667 × 0.016667 = 0.000278
  newTime     = 0 + 0.016667           = 0.016667
```

`recordedData = [{ time: 0.016667, position: 0.000278, velocity: 0.033333, acceleration: 2 }]`

### Tick 2 — `now = 1033.333`

```
frameTime = (1033.333 - 1016.667) / 1000 = 0.016667
last.current = 1033.333

onRecordStep({ position: 0.000278, velocity: 0.033333, acceleration: 2, time: 0.016667 }, 0.016667)
  newVelocity = 0.033333 + 2 × 0.016667 = 0.066667
  avgVelocity = (0.033333 + 0.066667) / 2 = 0.05
  newPosition = 0.000278 + 0.05 × 0.016667 = 0.001111
  newTime     = 0.016667 + 0.016667 = 0.033333
```

`recordedData` now has 2 entries — playback would become eligible starting next tick (`length > 1`).

### Tick 3 — `now = 1050.0`

```
frameTime = (1050.0 - 1033.333) / 1000 = 0.016667
last.current = 1050.0

onRecordStep({ position: 0.001111, velocity: 0.066667, acceleration: 2, time: 0.033333 }, 0.016667)
  newVelocity = 0.066667 + 2 × 0.016667 = 0.1
  avgVelocity = (0.066667 + 0.1) / 2 = 0.083333
  newPosition = 0.001111 + 0.083333 × 0.016667 = 0.0025
  newTime     = 0.033333 + 0.016667 = 0.05
```

Final `recordedData` after 3 ticks:

```js
[
  { time: 0.016667, position: 0.000278, velocity: 0.033333, acceleration: 2 },
  { time: 0.033333, position: 0.001111, velocity: 0.066667, acceleration: 2 },
  { time: 0.05,      position: 0.0025,   velocity: 0.1,      acceleration: 2 },
]
```

At `t = 0.05`, the analytic formula `x = ½at² = ½ × 2 × 0.05² = 0.0025` matches exactly — the average-velocity integration (#1) is exact for constant acceleration, so no numerical drift accumulates.

## 8. Full numeric example — PLAYBACK mode

Setup: `recordedData` already has 5 points (`acceleration = 2` throughout):

```js
const recordedData = [
  { time: 0.0, position: 0.0,  velocity: 0.0, acceleration: 2 },
  { time: 0.5, position: 0.25, velocity: 1.0, acceleration: 2 },
  { time: 1.0, position: 1.0,  velocity: 2.0, acceleration: 2 },
  { time: 1.5, position: 2.25, velocity: 3.0, acceleration: 2 },
  { time: 2.0, position: 4.0,  velocity: 4.0, acceleration: 2 },
];
```

`selectedMode = "playback"`, `recordedData.length (5) > 1` → playback branch runs. Current `playbackTime = 0.9`, this tick's `frameTime = 0.2`.

```
onPlaybackStep({ playbackTime: 0.9, recordedData }, 0.2)
  newTime = 0.9 + 0.2 = 1.1

  resolvePlaybackState(recordedData, 1.1):
    maxTime = 2.0
    1.1 >= 2.0 → false → falls through to interpolateStateAtTime

  interpolateStateAtTime(recordedData, 1.1):
    binary search, lo=0, hi=4
      mid=2, data[2].time (1.0) < 1.1 → true → lo=3
      lo=3, hi=4
      mid=3, data[3].time (1.5) < 1.1 → false → hi=3
      loop ends: lo === hi === 3

    next = data[3] = { time: 1.5, ... };  next.time (1.5) <= 1.1? → false → continue
    prev = data[2] = { time: 1.0, position: 1.0, velocity: 2.0, acceleration: 2 }

    t = (1.1 - 1.0) / (1.5 - 1.0) = 0.2
    position = 1.0 + (2.25 - 1.0) × 0.2 = 1.25
    velocity = 2.0 + (3.0 - 2.0) × 0.2  = 2.2
    acceleration = prev.acceleration = 2   (copied, not blended)

    → { time: 1.1, position: 1.25, velocity: 2.2, acceleration: 2 }

  resolvePlaybackState returns { simulation: <above>, isEndOfPlayback: false }
```

`onPlaybackStep` result:

```js
{
  simulation: { time: 1.1, position: 1.25, velocity: 2.2, acceleration: 2 },
  data: { playbackTime: 1.1 },
  isEndOfPlayback: false,
}
```

`useSimulationLoop` applies it: `setSimulation(result.simulation)`, merges `{ playbackTime: 1.1 }` into `data`, and since `isEndOfPlayback` is `false`, `playing` stays `true`.

### Subtlety: interpolation overshoots slightly

The true analytic position at `t = 1.1` is `½ × 2 × 1.1² = 1.21`, but linear interpolation gave `1.25` — a small overshoot, because position is *quadratic* in time under constant acceleration, and lerping between two quadratic points along a straight line always sits slightly above the curve between them. Velocity has no such error (`2.2` is exact) because velocity is *linear* in time, and lerping between two points on a line reproduces the line exactly. This is the same acceleration-not-interpolated point #5's doc calls out, one level up: only quantities that are actually linear in time survive interpolation exactly.

## 9. Why this matters for `App.jsx`

### Quick Note

Same pattern as #4 and #5: `useSimulationLoop` only orchestrates *when* to call physics — it never contains physics itself.

### Answer

- `useSimulationLoop` never imports `calculatePhysicsStep` or `interpolateStateAtTime` directly. It only calls `onRecordStep` / `onPlaybackStep` — two props handed in from outside.
- `App.jsx` is what makes those props *mean* anything: it wires `onRecordStep={handleRecordingStep}` (#4) and `onPlaybackStep={handlePlaybackStep}` (#5), and passes its own `simulation`/`data`/`setSimulation`/`setData`/`setPlaying` state into the hook.
- Because the hook has zero engine imports, it's **reusable framework infrastructure** (per CLAUDE.md's layer map) — a future simulation #2 with entirely different physics could reuse this exact hook by wiring in different callbacks, without touching a single line of `useSimulationLoop.js`.

### Extra Tips

Per `logic-study-order.md`, #6 depends on **both** #4 and #5 already existing — it doesn't add new physics logic, it just decides *which* of those two to call each frame (`selectedMode` branch) and *how much* time to advance them by (`frameTime`). Next up is **#7 (`App.jsx` orchestration)** — the piece that owns real `simulation`/`data`/`playing` state and wires it, together with `handleRecordingStep`/`handlePlaybackStep`, into this hook to make the whole loop actually run.
