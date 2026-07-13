# One tick, mount → `recordedData[1]`

Setup: you'll set velocity = 2, acceleration = 1, press Play. Real numbers throughout (ms = page age).

## 1. MOUNT (page age ~500ms)

[main.jsx:6](../src/main.jsx#L6) renders `<App />`. Three states are born ([App.jsx:19-33](../src/App.jsx#L19)):

```js
simulation = { position: 0, velocity: 0, acceleration: 0, time: 0 }
playing    = false
data.recordedData = [{ time: 0, position: 0, velocity: 0, acceleration: 0 }]  // seed frame [0]
```

App calls the hook, injecting the engine ([App.jsx:43-44](../src/App.jsx#L43)):

```js
onRecordStep: handleRecordingStep,   // hook stays engine-blind
```

Inside the hook, refs are born ([useSimulationLoop.js:14-16](../src/hooks/useSimulationLoop.js#L14)):

```js
last = 500          // performance.now() at mount
recordRealTimeStart = null
recordPauseStartTime = null
```

Effect #3 starts the RAF chain ([useSimulationLoop.js:101](../src/hooks/useSimulationLoop.js#L101)). It ticks every ~16.6ms but `if (playing)` is false → heartbeat only, no work.

## 2. You set v = 2, a = 1

Each commit flows `PhysicsInput` → `handleSimulationChange` ([App.jsx:139-146](../src/App.jsx#L139)), which updates state **and** rewrites the seed (because `time === 0`):

```js
simulation      = { position: 0, velocity: 2, acceleration: 1, time: 0 }
recordedData[0] = { time: 0,     position: 0, velocity: 2, acceleration: 1 }
```

## 3. PLAY (page age 5000ms)

`setPlaying(true)` ([App.jsx:69](../src/App.jsx#L69)) → effect #3 rebuilds: old RAF cancelled, `accumulator = 0`, new `loop` with `playing = true` baked in.

## 4. Frames deposit until one tick is affordable

Tick price = `1/24 ≈ 0.0417s` ([useSimulationLoop.js:60](../src/hooks/useSimulationLoop.js#L60)). 60Hz frames deposit ~0.0167 each ([useSimulationLoop.js:68](../src/hooks/useSimulationLoop.js#L68)):

```
frame @5017:  accumulator = 0.0167   < 0.0417 → no tick
frame @5033:  accumulator = 0.0334   < 0.0417 → no tick
frame @5050:  accumulator = 0.0501   ≥ 0.0417 → TICK!
```

## 5. THE TICK (inside the `while`, [useSimulationLoop.js:69-97](../src/hooks/useSimulationLoop.js#L69))

Mode is `"record"` → record branch. Anchor is null → **born** ([useSimulationLoop.js:83](../src/hooks/useSimulationLoop.js#L83)):

```js
recordRealTimeStart = 5050 - (0 + 0.0417) × 1000 = 5008.3
realElapsedTime     = (5050 - 5008.3) / 1000     = 0.0417   // line 86 — the clock sample
```

Call the injected engine ([useSimulationLoop.js:88](../src/hooks/useSimulationLoop.js#L88) → [playback.js:72](../src/engine/playback.js#L72) → [kinematics1d.js:12](../src/engine/kinematics1d.js#L12)):

```js
newVelocity = 2 + 1 × 0.0417          = 2.0417        // v = v₀ + a·dt
avgVelocity = (2 + 2.0417) / 2        = 2.0208
newPosition = 0 + 2.0208 × 0.0417     = 0.0842        // x = x₀ + v_avg·dt
newTime     = 0.0417                                   // stamped from realElapsedTime
```

`handleRecordingStep` packages the snapshot ([playback.js:80-85](../src/engine/playback.js#L80)):

```js
recordedState = { time: 0.0417, position: 0.0842, velocity: 2.0417, acceleration: 1 }
```

## 6. The append — `recordedData` gets its value ([useSimulationLoop.js:89-93](../src/hooks/useSimulationLoop.js#L89))

```js
setSimulation(result.simulation);              // sprite/labels will move
setData(prev => ({ ...prev,
  recordedData: [...prev.recordedData, result.recordedState],
}));
// recordedData = [
//   { time: 0,      position: 0,      velocity: 2,      acceleration: 1 },  ← seed
//   { time: 0.0417, position: 0.0842, velocity: 2.0417, acceleration: 1 },  ← THE tick
// ]
```

Then `accumulator -= 0.0417 → 0.0084` (leftover carried), React re-renders: sprite at 0.0842, velocity label "2.04 m/s", chart draws its second point.

## The pipeline in one line

```
mount(state+refs) → play(rebuild loop) → frames fill accumulator → tick:
  anchor→time  →  onRecordStep→physics→snapshot  →  setData appends → render
```

Every subsequent entry in `recordedData` is step 5-6 repeating, 24× per second — same price, same math, new numbers.
