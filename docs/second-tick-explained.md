# Second tick, `recordedData[1]` → `recordedData[2]`

Continues directly from [one-tick-explained.md](one-tick-explained.md) — same run, same `v = 2, a = 1`. Picking up exactly where that doc stopped: page age 5050ms, first tick just appended, RAF chain still running.

## 0. State carried over from tick 1

```js
simulation = { position: 0.0842, velocity: 2.0417, acceleration: 1, time: 0.0417 }
recordedData = [
  { time: 0,      position: 0,      velocity: 2,      acceleration: 1 },  // seed
  { time: 0.0417, position: 0.0842, velocity: 2.0417, acceleration: 1 },  // tick 1
]
```

Refs left behind by tick 1 ([useSimulationLoop.js:14-16](../src/hooks/useSimulationLoop.js#L14)):

```js
last.current                 = 5050    // stamped every frame, tick or not
recordRealTimeStart.current  = 5008.3  // born once during tick 1 — never reset mid-run
recordPauseStartTime.current = null
accumulator                  = 0.0084  // leftover after tick 1 paid its 0.0417 price
```

## 1. The one thing that's different this time: no rebirth

Tick 1's anchor line only fires when the ref is `null` ([useSimulationLoop.js:76-78](../src/hooks/useSimulationLoop.js#L76)):

```js
if (recordRealTimeStart.current === null) {
  recordRealTimeStart.current = now - (sim.time + FIXED_TIMESTEP) * 1000;
}
```

It isn't null anymore, so this branch is **skipped** on tick 2 and every tick after. The anchor from tick 1 (5008.3) is what every future `realElapsedTime` gets measured against. This one line is the entire relationship between the two docs: tick 1 sets the clock's zero point, tick 2+ just read it.

## 2. Frames deposit until the second tick is affordable

Same `FIXED_TIMESTEP = 0.0417` price ([useSimulationLoop.js:55](../src/hooks/useSimulationLoop.js#L55)), but starting from 0.0084 instead of 0 — tick 2 is cheaper to reach:

```
frame @5067:  accumulator = 0.0084 + 0.0167 = 0.0251   < 0.0417 → no tick
frame @5083:  accumulator = 0.0251 + 0.0167 = 0.0418   ≥ 0.0417 → TICK!
```

Only 2 frames needed this time, versus 3 for tick 1 — the carried-over leftover is doing work.

## 3. THE TICK (inside the same `while`, [useSimulationLoop.js:63-89](../src/hooks/useSimulationLoop.js#L63))

Mode is still `"record"`. Anchor already exists, so line 79 is the only thing that runs before the engine call:

```js
realElapsedTime = (5083 - 5008.3) / 1000 = 0.0747   // line 79 — real wall clock, not 2×0.0417
```

Notice this is **not** `2 × 0.0417 = 0.0834`. Tick 1's timestamp only looked like a clean multiple of `FIXED_TIMESTEP` because the birth formula on line 77 was algebraically constructed to force that (`now - (sim.time + FIXED_TIMESTEP) * 1000`, then immediately reading `(now - that) / 1000` gives back `sim.time + FIXED_TIMESTEP` exactly). From tick 2 onward there's no such trick — `realElapsedTime` is genuinely `(now - anchor) / 1000`, so it drifts with real frame-timing jitter (here, ~8.7ms behind the idealized value).

Call the injected engine ([useSimulationLoop.js:80](../src/hooks/useSimulationLoop.js#L80) → [playback.js:72](../src/engine/playback.js#L72) → [kinematics1d.js:12](../src/engine/kinematics1d.js#L12)):

```js
newVelocity = 2.0417 + 1 × 0.0417        = 2.0834       // v = v₀ + a·dt — deltaTime is ALWAYS the fixed 0.0417
avgVelocity = (2.0417 + 2.0834) / 2      = 2.0626
newPosition = 0.0842 + 2.0626 × 0.0417   = 0.1702        // x = x₀ + v_avg·dt
newTime     = 0.0747                                      // stamped from realElapsedTime, NOT from deltaTime
```

This is the key split to notice: **the physics math never sees the jitter.** `calculatePhysicsStep` always integrates with `deltaTime = FIXED_TIMESTEP`, so velocity and position are exact and framerate-independent every tick. Only the `time` field stamped onto the recorded point ([kinematics1d.js:18-21](../src/engine/kinematics1d.js#L18)) reflects the messier real-world clock.

`handleRecordingStep` packages the snapshot ([playback.js:80-85](../src/engine/playback.js#L80)):

```js
recordedState = { time: 0.0747, position: 0.1702, velocity: 2.0834, acceleration: 1 }
```

## 4. The append — `recordedData` gets its third value ([useSimulationLoop.js:81-85](../src/hooks/useSimulationLoop.js#L81))

```js
setSimulation(result.simulation);
setData(prev => ({ ...prev,
  recordedData: [...prev.recordedData, result.recordedState],
}));
// recordedData = [
//   { time: 0,      position: 0,      velocity: 2,      acceleration: 1 },  ← seed
//   { time: 0.0417, position: 0.0842, velocity: 2.0417,  acceleration: 1 },  ← tick 1
//   { time: 0.0747, position: 0.1702, velocity: 2.0834,  acceleration: 1 },  ← THE tick
// ]
```

`accumulator -= 0.0417 → 0.0001` (almost fully spent), React re-renders again, chart draws its third point — this one not evenly spaced in time from the second, because `time` is wall-clock-derived while position/velocity are not.

## What tick 2 teaches that tick 1 couldn't

Reading tick 1 alone, you'd assume `time` always advances in clean `0.0417` increments — it's a coincidence of the birth formula. Tick 2 shows the real invariant:

| Quantity | Source | Behavior across ticks |
|---|---|---|
| `deltaTime` fed to physics | `FIXED_TIMESTEP` constant | Always exactly `0.0417` — deterministic, framerate-independent |
| `time` field on the recorded point | `realElapsedTime` = wall clock since anchor | Drifts with actual frame arrival jitter, not a clean multiple after tick 1 |

Every tick from here on is step 2-4 of this doc repeating — anchor never reborn, `realElapsedTime` walking the real clock, physics math walking a perfectly even one.
