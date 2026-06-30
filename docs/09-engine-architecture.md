# Engine Architecture

## Separation of concerns

The simulation logic is split into three layers with clear boundaries:

```
src/
├── engine/
│   ├── kinematics1d.js   — pure physics math (no React, no state)
│   └── playback.js       — record/playback state transitions (no React)
└── hooks/
    └── useSimulationLoop.js  — RAF loop, timing, React integration
```

## `kinematics1d.js` — pure physics

Contains a single exported function:

```js
export function calculatePhysicsStep(simulation, deltaTime, realElapsedTime)
```

**Input:** current simulation snapshot, a timestep in seconds, optional real wall-clock elapsed time.  
**Output:** a new simulation snapshot (plain object, no side effects).

This function has no imports and no dependencies. It can be unit tested with plain Node.js. The average-velocity integration is exact for constant acceleration.

`realElapsedTime` overrides the physics-accumulated time when provided. This keeps the displayed timer synchronized with wall clock even when the fixed-timestep accumulator introduces sub-tick rounding.

## `playback.js` — record/playback logic

Imports only `calculatePhysicsStep`. Exports three functions:

### `findClosestState(recordedData, targetTime)`
Linear scan returning the snapshot with `time` closest to `targetTime`. Used by both the playback loop and the timeline drag handler in `App.jsx`.

### `handleRecordingStep(simulation, deltaTime, realElapsedTime)`
Calls `calculatePhysicsStep` and packages the result into `{ simulation, recordedState }`. The caller (`useSimulationLoop`) is responsible for appending `recordedState` to `data.recordedData`.

### `handlePlaybackStep(data, deltaTime)`
Advances `data.playbackTime` by `deltaTime`, finds the closest recorded snapshot, and returns `{ simulation, data, isEndOfPlayback }`. When `isEndOfPlayback` is true, `simulation.playing` is set to false and `isPlayback` to false — the loop will stop on the next tick.

Neither engine file imports React or calls any setter. They are pure functions over plain JavaScript objects.

## `useSimulationLoop` — React integration

The hook owns the RAF lifecycle. Its responsibilities:

1. **Timing** — wall-clock start time, pause compensation (see [04-time-system.md](04-time-system.md))
2. **Fixed timestep accumulator** — runs physics at 24 Hz regardless of display rate
3. **Branching** — decides each tick whether to call the recording or playback handler
4. **State writeback** — calls `setSimulation` and `setData` with the engine's output

The hook takes `setSimulation` and `setData` as parameters (stable React refs) and lists them in the `useEffect` dependency array to satisfy the lint rule, but the RAF itself closes over `simulationRef` and `dataRef` to read fresh state without triggering loop teardowns on every render.

## Why this layering matters

- The engine can be tested or reused without React
- Timing bugs are isolated to the hook
- Physics bugs are isolated to `kinematics1d.js`
- The loop can be replaced (e.g. with a Web Worker) without touching the physics functions
