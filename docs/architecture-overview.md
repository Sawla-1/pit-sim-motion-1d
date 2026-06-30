# Architecture Overview

A 1D kinematics simulation built with React + Vite. Users set initial conditions, record a constant-acceleration run, then replay it with timeline scrubbing.

## File map

```
src/
├── App.jsx                       — state owner, control logic, layout
├── main.jsx                      — React root mount
├── components/
│   ├── Simulation3D.jsx          — R3F canvas: sprite, ruler, labels
│   ├── Charts.jsx                — Chart.js graphs, drag-to-scrub
│   └── Controls.jsx              — parameter inputs, mode radio, buttons
├── hooks/
│   └── useSimulationLoop.js      — RAF loop, fixed timestep, timing
└── engine/
    ├── kinematics1d.js           — average-velocity integration (pure)
    └── playback.js               — record/playback state transitions (pure)
```

## Dependency graph

```
App.jsx
  ├── uses: useSimulationLoop
  │           ├── uses: handleRecordingStep  (playback.js)
  │           │           └── uses: calculatePhysicsStep  (kinematics1d.js)
  │           └── uses: handlePlaybackStep   (playback.js)
  │                       └── uses: findClosestState      (playback.js)
  ├── renders: Simulation3D   (no engine imports)
  ├── renders: Charts         (no engine imports)
  └── renders: Controls       (no engine imports)
```

## Key design decisions

### All state in App
Child components are purely presentational. This makes state transitions predictable: every change to `simulation` or `data` happens in a named handler in `App.jsx`, never inside a child.

### Fixed 24 Hz physics timestep
The RAF loop runs at display refresh rate but physics steps fire at 24 Hz via a frame accumulator. This makes recorded data uniform (consistent sample spacing) and graph lines straight, independent of the user's monitor refresh rate.

### Real wall-clock time for the timer
`simulation.time` is set from `performance.now()` wall-clock elapsed time, not from accumulated fixed-timestep ticks. Pause compensation adjusts the start reference so the timer reads real seconds without drift.

### Pure engine functions
`kinematics1d.js` and `playback.js` have no React imports. They are plain JS functions that take state and return new state. The hook owns all RAF and React integration.

### Local string state for inputs
`Controls.jsx` keeps local string state for each parameter input so users can type intermediate values without the field snapping. Commit happens on blur/Enter via `evaluateExpression`, which accepts basic arithmetic.

## Detailed docs

| Topic | File |
|---|---|
| Physics quantities and equations | [01-domain-model.md](01-domain-model.md) |
| State shape and update patterns | [02-state-management.md](02-state-management.md) |
| Prop/callback data flow | [03-data-flow.md](03-data-flow.md) |
| Timer, pause compensation, 24 Hz loop | [04-time-system.md](04-time-system.md) |
| Record/playback state machine | [05-playback-system.md](05-playback-system.md) |
| Chart annotation line and drag-scrub | [06-timeline-design.md](06-timeline-design.md) |
| Input validation and expression eval | [07-input-validation.md](07-input-validation.md) |
| R3F canvas, sprites, ruler, Chart.js | [08-rendering-architecture.md](08-rendering-architecture.md) |
| Engine layer design and hook integration | [09-engine-architecture.md](09-engine-architecture.md) |
