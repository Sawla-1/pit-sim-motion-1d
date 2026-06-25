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

This is a 1D kinematics physics simulation built with React + Vite. The simulation models constant-acceleration motion with record and playback modes.

### State lives entirely in `App.jsx`

All simulation logic and state is centralized in `App`. Child components are purely presentational — they receive props and call callback handlers; they hold no physics state.

**`simulation` state** — current physics snapshot:
```js
{ position, velocity, acceleration, time, playing }
```

**`data` state** — recording/playback metadata:
```js
{ recordedData, selectedMode, playbackTime, isPlayback }
```

### Physics loop — `Simulation3D.jsx`

The animation loop runs via `requestAnimationFrame` (not R3F's `useFrame`) to guarantee a **fixed 24 FPS physics timestep** regardless of display refresh rate. Frame accumulation handles display rates faster than 24 FPS. This produces straight, consistent graph lines.

`realTimeStart` and `pauseStartTime` refs track wall-clock time so the displayed timer matches real elapsed time even through pauses.

### Data flow

1. `Simulation3D` calls `onSimulationStep(deltaTime, realElapsedTime)` on each physics tick.
2. `App.handleSimulationStep` dispatches to either:
   - **Record mode**: `handleRecordingStep` → `calculatePhysicsStep` (pure kinematics: average-velocity method) → appends to `recordedData`.
   - **Playback mode**: `handlePlaybackStep` → `findClosestState` (linear search over `recordedData`) → sets simulation to closest recorded snapshot.
3. `Charts` reads `data.recordedData` to render position/velocity/acceleration vs. time graphs.
4. In playback mode, dragging on a chart canvas calls `onSetPlaybackTime`, which scrubs `playbackTime` and seeks the 3D sprite accordingly.

### Component responsibilities

| File | Role |
|---|---|
| `src/App.jsx` | State, physics utilities, all control logic |
| `src/components/Simulation3D.jsx` | R3F canvas, ruler, sprite rendering, animation loop |
| `src/components/Charts.jsx` | Chart.js line graphs, timeline drag-scrub, show/hide toggles |
| `src/components/Controls.jsx` | Parameter inputs (text + range), mode radio, play/pause/reset/clear buttons |

### Controls input pattern

`Controls.jsx` keeps **local string state** for each input so users can type intermediate values (e.g. `-` or `1+2`). On blur/Enter, `evaluateExpression` (uses `Function` constructor, strips non-math chars) resolves the value; invalid input reverts to the last valid value via a `useRef`. External simulation changes sync back via `useEffect`.

### `formatNumber` duplication

`formatNumber` is defined independently in both `App.jsx` (1 decimal) and `Charts.jsx` (2 decimals) — intentional for now, not a bug.
