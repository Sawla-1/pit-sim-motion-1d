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
| Engine | `src/engine/kinematics1d.js`, `src/engine/recordPlayback.js`, `src/engine/evaluateExpression.js` | Pure functions only — no React, no state, no imports from other layers |
| Utils | `src/utils/formatNumber.js`, `src/utils/niceStep.js` | Shared pure utilities |
| Styles | `src/styles/buttonStyles.js`, `src/styles/seriesColors.js` | Style constants only (class strings, colors) — no React, no logic |
| Hooks | `src/hooks/useSimulationLoop.js`, `src/hooks/useChartZoom.js` | Animation loop (framework infrastructure, not simulation-specific); chart zoom/pan state |
| Components | `src/components/Simulation3D.jsx`, `src/components/Charts.jsx`, `src/components/ChartControls.jsx`, `src/components/PhysicsInput.jsx`, `src/components/Controls.jsx` | Purely presentational — receive props, call callbacks, hold no physics state |
| Shell | `src/App.jsx` | All state and control logic |

### State lives entirely in `App.jsx`

**`simulation` state** — current physics snapshot:
```js
{ position, velocity, acceleration, time }
```

**`playing` state** — boolean, separate from `simulation`.

**`playbackTried` state** — boolean. Turns `true` the first time the user switches to Playback; `Controls` uses it to stop the pulsing hint ring on the Playback button.

**`scrubTried` state** — boolean. Turns `true` the first time the user drags a chart in Playback; `Charts` uses it to hide the scrub hint (a pulsing hand + ↔ arrow icon with the text "Drag to move time"). Next/previous frame buttons don't count.

**`pin` state** — `null` or one pinned snapshot `{ time, position, velocity, acceleration }`. Set by the Pin button in `Controls` (playback only); `Charts` draws a dot + always-visible label for it on all 3 charts. Pressing the button at the pinned time (within `PIN_TOLERANCE`, 0.05 s) unpins; anywhere else it moves the pin there. Cleared by Clear Data and Reset All.

**`data` state** — recording/playback metadata:
```js
{ recordedData, selectedMode }
```
`selectedMode` is `'record'` or `'playback'` (replaces the old `isPlayback` boolean). Playback position lives in `simulation.time` — there is no separate `playbackTime` field.

### Physics loop — `useSimulationLoop.js`

The animation loop runs via `requestAnimationFrame` inside `useSimulationLoop`. It is a **real per-frame delta loop** (PhET-style), not a fixed timestep: each tick advances physics by the actual wall-clock gap since the last frame (`(now - last.current) / 1000`), clamped to `MAX_FRAME_TIME = 0.1s` so a stalled/backgrounded frame can't inject one huge jump.

There are no `recordRealTimeStart` / `recordPauseStartTime` refs. Recording time is simply `simulation.time + frameTime` each tick — when `playing` is `false` the loop's `if (playing)` guard skips the physics call entirely, so time just stops advancing without needing any wall-clock anchor to resume from.

The hook takes `onRecordStep` and `onPlaybackStep` callback props and dispatches to whichever one applies each tick, based on `data.selectedMode`. `App.jsx` injects `handleRecordingStep` / `handlePlaybackStep` from `engine/recordPlayback.js` as those callbacks — the hook itself has no import from the engine layer, so it stays engine-agnostic and reusable by future simulations. Chart drag-to-scrub calls `handlePlaybackSeek` directly (an absolute-time jump, not a per-tick step), sharing the same `resolvePlaybackState` lookup internally.

### Engine layer

- **`engine/kinematics1d.js`** — `calculatePhysicsStep(simulation, deltaTime)`: pure average-velocity integration. No side effects.
- **`engine/recordPlayback.js`** — exports `handleRecordingStep`, `handlePlaybackStep`, `handlePlaybackSeek` (internal helpers: `resolvePlaybackState`, `interpolateStateAtTime`): recording/playback state machine. Only `handleRecordingStep` imports from `kinematics1d`; the rest are physics-agnostic and operate purely on the timestamped `recordedData` array.
- **`engine/evaluateExpression.js`** — `evaluateExpression(expression)`: safely evaluates math expressions typed by users (uses `Function` constructor, strips non-math chars).

### Data flow

1. `useSimulationLoop` fires `requestAnimationFrame` each frame, advancing physics by the real elapsed wall-clock delta (clamped at 0.1s).
2. Each tick dispatches to:
   - **Record mode**: `handleRecordingStep` → `calculatePhysicsStep` → appends to `recordedData` via `setData`.
   - **Playback mode**: `handlePlaybackStep` → `interpolateStateAtTime` over `recordedData` → updates `simulation` via `setSimulation`.
3. `Charts` reads `data.recordedData` to render position/velocity/acceleration vs. time graphs.
4. In playback mode, dragging on a chart canvas calls `onSeek`, which scrubs `simulation.time` and seeks the 3D sprite.
5. In playback mode, the next/previous frame buttons in `Controls` call `handleNextFrame` / `handlePrevFrame` in `App.jsx`, which call the same `handleSeek` at `simulation.time ± FRAME_STEP` (0.1 s; previous is clamped at 0).

### Component responsibilities

| File | Role |
|---|---|
| `src/App.jsx` | State, control logic, wires all components and the loop hook |
| `src/hooks/useSimulationLoop.js` | RAF animation loop, real per-frame delta (clamped), pause/resume timing |
| `src/components/Simulation3D.jsx` | R3F canvas, ruler, sprite rendering — receives `position` and `velocity` props (velocity picks walking/standing sprite and facing direction) |
| `src/components/Charts.jsx` | Chart.js line graphs, timeline drag-scrub, show/hide toggles, scrub hint, pinned point (dot + label) |
| `src/components/ChartControls.jsx` | `ChartPanel` (one chart with its show/hide, zoom, pan and reset buttons, and the scrub hint) and `ChartZoomControls` |
| `src/components/PhysicsInput.jsx` | One parameter input beside its chart: name, number box + unit, vertical slider |
| `src/components/Controls.jsx` | Bottom bar: Clear, mode radio, prev/play/next buttons (prev/next: playback mode only, disabled while playing), Pin / Unpin button (playback mode only), Reset All; the Playback button shows a hint ring until `playbackTried` |

### Input pattern

`PhysicsInput.jsx` keeps a **draft string** for its input only while the user is typing, so they can enter intermediate values (e.g. `-` or `1+2`). When not typing (`draft === null`), the box shows the live `value` prop directly — no `useEffect` sync, which would set state every frame during playback. On blur/Enter, `evaluateExpression` from `engine/evaluateExpression.js` resolves the value; valid input is sent up via `onChange`, invalid input is dropped, and the draft is cleared so the box falls back to the live value.

### Utilities

- **`utils/formatNumber.js`** — `formatNumber(n, decimals)`: single shared implementation used by both `App.jsx` (1 decimal) and `Charts.jsx` (2 decimals).
- **`utils/niceStep.js`** — `niceStep(range, maxCount)`: smallest round step (1, 2, 5, 10, ...) that splits a range into at most `maxCount` pieces. Used by the ruler in `Simulation3D.jsx`.

### Styles

- **`styles/buttonStyles.js`** — shared Tailwind class strings for buttons: `whiteLook` ("on" look), `disabledIcon` ("off" look), `offPill` ("off" look for a wrapper div). Used by the chart buttons; the dark bottom bar keeps its own looks in `Controls.jsx`.
- **`styles/seriesColors.js`** — `SERIES_COLORS`: one color (plus a lighter slider track color) per quantity: position, velocity, acceleration.


## Keeping This File Current

After changing code or adding a feature, check whether anything in this file is now wrong or missing (file list, layer map, state shape, data flow, commands). If so, propose the CLAUDE.md update in the same task and wait for approval before editing. Skip small changes that don't affect the architecture (typos, styling, renames).
