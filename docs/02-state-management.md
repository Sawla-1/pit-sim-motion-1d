# State Management

## Principle

All state lives in `App.jsx`. Every child component is purely presentational — it receives values via props and fires callbacks. No component below `App` owns simulation state.

## Two state objects

### `simulation` — the live physics snapshot

```js
const [simulation, setSimulation] = useState({
  position: 0,
  velocity: 0,
  acceleration: 0,
  time: 0,
  playing: false,
});
```

This reflects the current moment in the simulation. In playback mode it is overwritten each tick with a historical snapshot from `recordedData`.

### `data` — recording and playback metadata

```js
const [data, setData] = useState({
  recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }],
  selectedMode: "record",   // 'record' | 'playback'
  playbackTime: 0,
  isPlayback: false,
});
```

`selectedMode` is what the user selected via radio button. `isPlayback` is whether the loop is actually playing back right now — they differ because you can be in "playback mode" but paused.

## Why two objects instead of one

`simulation` changes every tick (24 Hz) during play. `data.recordedData` also grows every tick in record mode. Keeping them separate lets React batch or skip re-renders more predictably, and it makes the read pattern in the animation loop cleaner via `simulationRef` and `dataRef`.

## Refs for loop-safe reads

`useSimulationLoop` maintains two always-current refs:

```js
const simulationRef = useRef(simulation);
simulationRef.current = simulation;
const dataRef = useRef(data);
dataRef.current = data;
```

The `requestAnimationFrame` callback closes over these refs, not over the state directly, so it always sees the latest values without being listed as a `useEffect` dependency. This avoids tearing down and rebuilding the RAF loop on every tick.

## State mutations and their triggers

| Action | What changes |
|---|---|
| Play pressed (record mode) | `simulation.playing = true` |
| Play pressed (playback mode) | `simulation.playing = true`, `data.isPlayback = true` |
| Pause pressed | `simulation.playing = false`, `data.isPlayback = false` |
| Each record tick | `simulation` (new physics), `data.recordedData` (new snapshot appended) |
| Each playback tick | `simulation` (overwritten from history), `data.playbackTime` (advanced) |
| Mode switch to playback | `simulation` reset to first recorded snapshot, `data.playbackTime = 0` |
| Mode switch to record | `simulation` set to last recorded snapshot |
| Reset | Everything returns to initial state |
| Clear | `recordedData` reset to single zero-point, mode forced to record |
| Timeline drag | `data.playbackTime` set, `simulation` snapped to nearest snapshot |
