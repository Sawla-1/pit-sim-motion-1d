# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite, hot reload)
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

No test suite is configured.

## Architecture

This is a 1D kinematics physics simulation built with React + Vite. The simulation models constant-acceleration motion with record and playback modes. It is **simulation #1** in a planned multi-simulation educational framework — every architectural decision should be evaluated through the lens of "would this change be required if we added simulation #2?"

### Layer map

| Layer | Files | Rule |
|---|---|---|
| Engine | `src/engine/kinematics1d.js`, `src/engine/playback.js`, `src/engine/evaluateExpression.js` | Pure functions only — no React, no state, no imports from other layers |
| Utils | `src/utils/formatNumber.js` | Shared pure utilities |
| Hook | `src/hooks/useSimulationLoop.js` | Animation loop — framework infrastructure, not simulation-specific |
| Components | `src/components/Simulation3D.jsx`, `src/components/Charts.jsx`, `src/components/Controls.jsx` | Purely presentational — receive props, call callbacks, hold no physics state |
| Shell | `src/App.jsx` | All state and control logic |

### State lives entirely in `App.jsx`

**`simulation` state** — current physics snapshot:
```js
{ position, velocity, acceleration, time }
```

**`playing` state** — boolean, separate from `simulation`.

**`data` state** — recording/playback metadata:
```js
{ recordedData, selectedMode, playbackTime }
```
`selectedMode` is `'record'` or `'playback'` (replaces the old `isPlayback` boolean).

### Physics loop — `useSimulationLoop.js`

The animation loop runs via `requestAnimationFrame` inside `useSimulationLoop`. It uses a **fixed 24 FPS physics timestep** with frame accumulation to handle displays faster than 24 FPS. This produces straight, consistent graph lines.

`recordRealTimeStart` and `recordPauseStartTime` refs track wall-clock time so the displayed timer matches real elapsed time through pauses.

The hook takes `onRecordStep` and `onPlaybackStep` callback props and dispatches to whichever one applies each tick, based on `data.selectedMode`. `App.jsx` injects `handleRecordingStep` / `handlePlaybackStep` from `engine/playback.js` as those callbacks — the hook itself has no import from the engine layer, so it stays engine-agnostic and reusable by future simulations.

### Engine layer

- **`engine/kinematics1d.js`** — `calculatePhysicsStep(simulation, deltaTime, realElapsedTime)`: pure average-velocity integration. No side effects.
- **`engine/playback.js`** — `handleRecordingStep`, `handlePlaybackStep`, `findClosestState`: recording/playback state machine. Imports from `kinematics1d`.
- **`engine/evaluateExpression.js`** — `evaluateExpression(expression)`: safely evaluates math expressions typed by users (uses `Function` constructor, strips non-math chars).

### Data flow

1. `useSimulationLoop` fires `requestAnimationFrame` at a fixed 24 FPS timestep.
2. Each tick dispatches to:
   - **Record mode**: `handleRecordingStep` → `calculatePhysicsStep` → appends to `recordedData` via `setData`.
   - **Playback mode**: `handlePlaybackStep` → `findClosestState` over `recordedData` → updates `simulation` via `setSimulation`.
3. `Charts` reads `data.recordedData` to render position/velocity/acceleration vs. time graphs.
4. In playback mode, dragging on a chart canvas calls `onSetPlaybackTime`, which scrubs `playbackTime` and seeks the 3D sprite.

### Component responsibilities

| File | Role |
|---|---|
| `src/App.jsx` | State, control logic, wires all components and the loop hook |
| `src/hooks/useSimulationLoop.js` | RAF animation loop, fixed timestep, pause/resume timing |
| `src/components/Simulation3D.jsx` | R3F canvas, ruler, sprite rendering — receives only `position` prop |
| `src/components/Charts.jsx` | Chart.js line graphs, timeline drag-scrub, show/hide toggles |
| `src/components/Controls.jsx` | Parameter inputs, mode radio, play/pause/reset/clear buttons |

### Controls input pattern

`Controls.jsx` keeps **local string state** for each input so users can type intermediate values (e.g. `-` or `1+2`). On blur/Enter, `evaluateExpression` from `engine/evaluateExpression.js` resolves the value; invalid input reverts to the last valid value via a `useRef`. External simulation changes sync back via `useEffect`.

### Utilities

- **`utils/formatNumber.js`** — `formatNumber(n, decimals)`: single shared implementation used by both `App.jsx` (1 decimal) and `Charts.jsx` (2 decimals).
