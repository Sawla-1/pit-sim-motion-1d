# Time System

## Two time concepts

| Name | Source | Purpose |
|---|---|---|
| `realElapsedTime` | `performance.now()` wall clock | What the timer display shows |
| `simulation.time` | Written from `realElapsedTime` each tick | Stored in recorded snapshots, used for chart x-axis |

In record mode these are the same value. In playback mode `simulation.time` is overwritten with `playbackTime`, which advances at the fixed 24 Hz rate through historical snapshots.

## Fixed 24 FPS physics timestep

The loop runs via `requestAnimationFrame`, which fires at the display refresh rate (often 60 or 120 Hz). A frame accumulator decouples physics from display rate:

```js
const FIXED_TIMESTEP = 1 / 24;  // ~41.67 ms

accumulator += frameTime;
while (accumulator >= FIXED_TIMESTEP) {
  // run one physics step
  accumulator -= FIXED_TIMESTEP;
}
```

At 60 Hz, every ~2–3 frames the accumulator overflows and one physics step runs. At 120 Hz, every ~5 frames. This keeps the recorded data at a consistent 24 samples/second regardless of the display device, which produces straight, smooth graph lines.

## Wall-clock tracking refs

Three refs in `useSimulationLoop` track real time:

```js
const realTimeStart = useRef(null);   // performance.now() when play was first pressed
const pauseStartTime = useRef(null);  // performance.now() when pause was pressed
```

### On play (first press)
`realTimeStart` is set to `now` inside the RAF callback on the first frame where `playing` is true.

### On pause
A `useEffect` watching `playing` records `pauseStartTime = performance.now()`.

### On resume
The same effect subtracts the pause duration from `realTimeStart` so the displayed timer does not jump forward:

```js
const pauseDuration = (performance.now() - pauseStartTime.current) / 1000;
realTimeStart.current += pauseDuration * 1000;
```

### On reset (time → 0)
A separate `useEffect` watching `time === 0` clears both refs to `null`, so the next play press starts fresh.

## Real elapsed time calculation

Each RAF frame (while playing):

```js
const realElapsedTime = (now - realTimeStart.current) / 1000;
```

This value is passed to `handleRecordingStep` and ultimately to `calculatePhysicsStep`, which uses it as the `time` field in the recorded snapshot:

```js
const newTime = realElapsedTime !== undefined
  ? realElapsedTime
  : simulation.time + deltaTime;
```

This means the displayed timer and the chart x-axis always reflect real wall-clock seconds, not accumulated fixed-timestep ticks.
