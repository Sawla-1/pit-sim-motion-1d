# Record Time: Wall-Clock Anchor → Plain `+= dt` Accumulation

Third code change on the `phet-style-redesign` branch, commit `3968554`. Follows from [variable-frame-time-explained.md](variable-frame-time-explained.md) — this doc explains *why* the anchor that change left behind turned out to be unnecessary, and what replaced it.

## The old behavior — anchor to a wall-clock timestamp

Record mode didn't track time by adding deltas. It recomputed it fresh from the real clock every frame, anchored to when recording started:

```js
// useSimulationLoop.js (old)
if (recordRealTimeStart.current === null) {
  recordRealTimeStart.current = now - (sim.time + frameTime) * 1000;
}
const realElapsedTime = (now - recordRealTimeStart.current) / 1000;
const result = onRecordStep(sim, frameTime, realElapsedTime);
```

This needed two extra refs (`recordRealTimeStart`, `recordPauseStartTime`) and two `useEffect`s just to keep the anchor correct across pauses and mode switches — pausing had to shift the anchor forward by the pause duration, or `realElapsedTime` would jump by the whole gap on resume.

**Why it existed:** under the *old* fixed-24fps accumulator (before this branch's first commit), physics steps ran in fixed `1/24s` chunks that didn't line up with real rendered frames — a slow frame could trigger several catch-up steps at once. Summing those fixed chunks (`simulation.time + deltaTime`) wouldn't necessarily equal real elapsed time, so the anchor existed purely to keep the *displayed* clock honest against a real stopwatch.

## The new behavior — just add deltaTime

```js
// engine/kinematics1d.js
const newTime = simulation.time + deltaTime;
```

```js
// useSimulationLoop.js (new)
const result = onRecordStep(sim, frameTime);
```

No anchor, no pause tracking, no reset-on-`time===0` effect — all removed.

**Why this is now correct:** since the earlier per-frame-delta change, `deltaTime` passed into a record step already *is* the real measured gap since the last frame (clamped to 0.1s). Summing real gaps telescopes into the same total as reading the clock directly:

```
frame 1: t=0.00 → t=0.017   dt = 0.017
frame 2: t=0.017 → t=0.033  dt = 0.016
frame 3: t=0.033 → t=0.050  dt = 0.017
sum of dt = 0.017 + 0.016 + 0.017 = 0.050  ==  real elapsed time (0.050 - 0.00)
```

The anchor was compensating for a mismatch that no longer exists — removing it isn't a shortcut, it's deleting dead-weight complexity.

**Pause, for free.** Old code needed `recordPauseStartTime` to explicitly shift the anchor across a pause. New code needs nothing: `onRecordStep` is only called `if (playing)` ([useSimulationLoop.js:47](../../src/hooks/useSimulationLoop.js#L47)), so pausing just means the loop skips adding `deltaTime` that frame. `simulation.time` stays exactly where it was and resumes cleanly — no bookkeeping required.

## Verified against the real (unmodified) source

Ran the actual `calculatePhysicsStep` through a set of checks rather than just reasoning about it:

| check | result |
|---|---|
| Jittery deltas `[0.0167, 0.0165, 0.017, 0.0168, 0.0164]` sum to `sim.time` | `0.0834` matched exactly |
| First-step position/velocity vs. hand-computed kinematics | matched exactly |
| Time frozen while "paused" (step function simply not called) | no drift |
| Resume after pause adds cleanly, no jump | `sim.time + 0.02` matched exactly |
| Playback interpolation reproduces every recorded sample exactly | all matched |
| Playback clamps exactly at the last recorded time | matched |

## How this compares to PhET

PhET's own `Sim.ts` does exactly this — plain accumulation, never a wall-clock read:

```js
phet.joist.elapsedTime += dt * 1000;
```

Their own reasoning (from a comment in that file): using real wall-clock time breaks reproducible recordings — two runs starting at different real-world moments would drift apart under a `now() - anchor` scheme, but never under a pure `+= dt` sum. Record mode now matches this, and matches what playback mode ([`handlePlaybackStep`](../../src/engine/playback.js#L49): `data.playbackTime + deltaTime`) was already doing.
