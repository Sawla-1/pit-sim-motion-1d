# CLAUDE.md

## Commands

```bash
npm run dev      # Start dev server (Vite, hot reload)
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

No test suite is configured.

## What this is

A 1D kinematics simulation (React + Vite) with record and playback modes. It is
simulation #1 of a planned multi-simulation educational framework. For every
change, ask: "would this change be required if we added simulation #2?"

## Layer rules (src/)

| Folder | Rule |
|---|---|
| `engine/` | Pure functions only. No React, no state, no imports from other layers |
| `utils/` | Shared pure helpers |
| `styles/` | Style constants only (class strings, colors) |
| `hooks/` | `useSimulationLoop` (animation loop, engine-agnostic), `useChartZoom` (chart zoom/pan state) |
| `components/` | Presentational: props in, callbacks out, no physics state (small screen-only state, like a typing draft, is fine) |
| `App.jsx` | All state and control logic |

## Things the code does not tell you

- The loop uses the real time between frames (`requestAnimationFrame`), clamped to
  `MAX_FRAME_TIME` (0.1 s). It is not a fixed timestep. `App.jsx` passes the engine
  step functions into the hook, so the hook never imports the engine.
- Playback position is `simulation.time` (there is no `playbackTime`). The mode is
  `data.selectedMode`: `'record'` or `'playback'`.
- `PhysicsInput` keeps a draft string only while the user types. It shows the live value
  otherwise, with no `useEffect` sync (the value changes every frame in playback).
- Pins A and B live in `App.jsx` state. `Charts` and `Simulation3D` both draw them.
- Reset All asks first (`ConfirmDialog`) unless nothing is recorded.

## Keeping this file current

Update it only if the layer rules or the commands change, and ask first. Do not list
files, state fields or behaviors here. The code shows them.
