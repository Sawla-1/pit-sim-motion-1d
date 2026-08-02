# Study Order: The 10 Logics in This Project

This project has 10 distinct, self-contained logical units. Some files bundle more than one. This doc lists them in the order to learn them, with the reason for that order.

## Start here

**`calculatePhysicsStep`** in `src/engine/kinematics1d.js`.

It's the engine block of the app: tiny, self-contained, zero dependencies on the rest of the codebase. It defines the state shape — `{ position, velocity, acceleration, time }` — that every other piece of logic either produces or consumes. Once you know this shape, everything else becomes "who reads/writes it, and when."

## The 10 logics, in order

| # | Logic | File | What it does | Why it comes here |
|---|---|---|---|---|
| 1 | Physics integration | `src/engine/kinematics1d.js` | `calculatePhysicsStep(simulation, deltaTime)` — pure average-velocity math | Zero dependencies; defines the state shape everything else uses |
| 2 | Number formatting | `src/utils/formatNumber.js` | `formatNumber(n, decimals)` — a `toFixed` wrapper | Trivial pure helper; called constantly from here on, worth knowing early |
| 3 | Expression parsing | `src/engine/evaluateExpression.js` | `evaluateExpression(expr)` — turns typed text like `1+2` into a number | Standalone, no physics knowledge needed; required before Controls.jsx |
| 4 | Recording | `src/engine/recordPlayback.js` | `handleRecordingStep` — calls #1, appends a timestamped point to `recordedData` | Directly wraps #1, so #1 must come first; introduces `recordedData` |
| 5 | Playback / interpolation | `src/engine/recordPlayback.js` | Chain: `interpolateStateAtTime` → `resolvePlaybackState` → `handlePlaybackStep` / `handlePlaybackSeek` | Operates on the `recordedData` array that #4 produces, so #4 must come first |
| 6 | Animation loop | `src/hooks/useSimulationLoop.js` | RAF loop, wall-clock delta, dispatches to #4 or #5 each frame | Can't understand its branching without knowing what it's dispatching to |
| 7 | App orchestration | `src/App.jsx` | `reset`, `switchMode`, `clearRecordedData`, `handleSeek`, `handleSimulationChange` | Wires #1–#6 together into real app state; needs all of them first |
| 8 | 3D scene render | `src/components/Simulation3D.jsx` | R3F canvas + ruler, receives only `position` | Purely presentational; safe to read once you know where `position` comes from (App's `simulation` state) |
| 9 | Parameter inputs | `src/components/Controls.jsx` | `PhysicsInput` — local text state, commits on blur via #3 | Needs #3 (`evaluateExpression`) and #7's callback contract |
| 10 | Charts + drag-scrub | `src/components/Charts.jsx` | Chart.js graphs; dragging the timeline calls into #5 via App | Most complex UI piece, touches nearly everything above — learn last |

## Dependency chain, visually

```
#1 calculatePhysicsStep
       │
       ▼
#4 handleRecordingStep ──> recordedData
       │
       ▼
#5 interpolateStateAtTime ──> resolvePlaybackState ──> handlePlaybackStep / handlePlaybackSeek
       │
       ▼
#6 useSimulationLoop (dispatches to #4 or #5 each frame)
       │
       ▼
#7 App.jsx (owns state, wires everything)
       │
       ├──> #8 Simulation3D (reads position)
       ├──> #9 Controls (reads/writes params, uses #2/#3)
       └──> #10 Charts (reads recordedData, seeks via #5)
```

`#2 formatNumber` and `#3 evaluateExpression` are cross-cutting utilities — no arrows point into them; they get called from whichever layer needs display formatting or text-input parsing.

## Note

CLAUDE.md previously documented `calculatePhysicsStep(simulation, deltaTime, realElapsedTime)` — the real signature is `(simulation, deltaTime)`, no third parameter. This was corrected in the doc on 2026-08-02.
