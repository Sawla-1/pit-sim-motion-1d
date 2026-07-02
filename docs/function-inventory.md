# Function Inventory — 1D Kinematics Simulation

## Top-level summary

**Total named or assigned functions: 25**, across 9 source files (`main.jsx` has none — it just mounts React).

**How the system works, start to finish.**

The user opens the app, and `main.jsx` hands control to `App`. `App` owns all the simulation data — current position, velocity, acceleration, time, and the full array of recorded states. It passes that data down to three child components that cannot change it directly. The animation loop lives in the `useSimulationLoop` hook, which runs a `requestAnimationFrame` callback every screen frame. On each tick, if the simulation is playing, the loop calls either `handleRecordingStep` or `handlePlaybackStep` depending on the current mode. In record mode, `handleRecordingStep` calls `calculatePhysicsStep` — a pure math function — and packages the result into a new entry for the recorded-data array. In playback mode, `handlePlaybackStep` calls `findClosestState` to find the nearest recorded snapshot for the current playback time. Either way, the new state is pushed back up through React setters into `App`, which re-renders. `Simulation3D` reads only `position` and moves the orange sprite. `Charts` reads the full `recordedData` array and draws all three graphs. `Controls` shows the parameter inputs; when the user types a value, `PhysicsInput` calls `commit`, which passes the string through `evaluateExpression` and hands the number up to `App` via a callback. The whole system flows one direction: user actions update `App` state, `App` state flows down to components, components display it.

---

## `src/utils/formatNumber.js`

### Rendering helpers

**`formatNumber`** — line 5

- **What it does:** Takes a number and a decimal count, returns a string with that many decimal places. Returns `"0"` for any non-finite input (NaN, Infinity, etc.).
- **Why it exists:** Several components display physics values as text. Without this, each display site would need its own `toFixed` call plus its own NaN check.
- **What calls it:** `App.jsx` (time display), `Charts.jsx` (tooltip labels and three live-value spans).
- **Removable or combinable?** No. Used in multiple files for the same purpose. Removing it would force every display site to duplicate the finite-number guard.

---

## `src/engine/evaluateExpression.js`

### Input parsing

**`evaluateExpression`** — line 5

- **What it does:** Takes a raw string the user typed, strips anything that isn't a number, operator, parenthesis, or decimal point, then evaluates the cleaned string as a math expression using the `Function` constructor. Returns the numeric result, or `null` if the input is empty, invalid, or non-finite.
- **Why it exists:** Users can type things like `-5`, `3.2`, or `9.8/2`. The browser's built-in number input doesn't support expressions. Without this, the input system would be limited to plain numeric values only.
- **What calls it:** `commit` inside `PhysicsInput` in `Controls.jsx`.
- **Removable or combinable?** No. It's the only place that parses and safely evaluates user-typed math. Kept in its own file because it has no dependency on React, physics, or state — it's a pure text-processing function.

---

## `src/engine/kinematics1d.js`

### Pure physics math

**`calculatePhysicsStep`** — line 12

- **What it does:** Given the current simulation state and a time step, calculates the next position and velocity using the average-velocity method (`avgVelocity = (v_old + v_new) / 2`). Returns a new object with updated position, velocity, time, and acceleration.
- **Why it exists:** This is the core physics calculation. It has no knowledge of React, the recording array, or the animation loop. The average-velocity method produces more accurate results than the naive Euler method — especially important for the straight graph lines.
- **What calls it:** `handleRecordingStep` in `playback.js`.
- **Removable or combinable?** No. It's the only function that performs kinematics math. Inlining it into `handleRecordingStep` would mix physics math with recording bookkeeping, making both harder to read independently.

---

## `src/engine/playback.js`

### State transition logic

**`findClosestState`** — line 13

- **What it does:** Walks the full `recordedData` array and returns the entry whose `time` value is nearest to a given `targetTime`.
- **Why it exists:** Playback doesn't re-run physics — it reads back recorded snapshots. Since snapshots are recorded at 24 FPS but playback time advances continuously, the playback time rarely falls exactly on a recorded timestamp. This function bridges that gap.
- **What calls it:** `handlePlaybackStep` (frame-by-frame during playback) and `handleSetPlaybackTime` in `App.jsx` (for immediate seek when the user drags on the chart).
- **Removable or combinable?** No. It's called from two different places for two different purposes, which is why it's standalone rather than inlined into either caller.

**`handlePlaybackStep`** — line 29

- **What it does:** Advances playback by one fixed timestep. Checks whether the new time has reached the end of the recorded data — if so, returns the last recorded state and signals that playback should stop. If not, calls `findClosestState` and returns that state with the new playback time.
- **Why it exists:** The animation loop needs to know what state the simulation should be at each frame during playback, including the end-of-playback stop condition. This keeps mode-specific logic out of the general animation loop.
- **What calls it:** The `loop` function inside `useSimulationLoop`, during each fixed-timestep tick when mode is `"playback"`.
- **Removable or combinable?** No. Inlining it into `useSimulationLoop` would put mode-specific logic inside the general animation loop.

**`handleRecordingStep`** — line 72

- **What it does:** Calls `calculatePhysicsStep` to get the next physics state, then packages that result into a new `{ time, position, velocity, acceleration }` object suitable for appending to the recorded-data array. Returns both the new simulation state and the new recorded entry.
- **Why it exists:** Recording requires two outputs per tick — the updated live state and a new entry for the recorded array. This function produces both in one call.
- **What calls it:** The `loop` function inside `useSimulationLoop`, during each fixed-timestep tick when mode is `"record"`.
- **Removable or combinable?** No. Merging it with `calculatePhysicsStep` would give the physics function knowledge of the recording format, which it doesn't need.

---

## `src/hooks/useSimulationLoop.js`

### React lifecycle / animation loop

**`useSimulationLoop`** — line 4

- **What it does:** A custom React hook that runs the entire animation loop. Manages three `useRef` values for timing, and two "always-current" refs so the RAF callback reads the latest state without stale closures. Sets up three `useEffect` calls: one to reset timing when `time` goes to zero, one to handle pause/resume timing math, and one to run the actual `requestAnimationFrame` loop.
- **Why it exists:** The animation loop needs to run outside React's render cycle, using refs to read current state without re-subscribing on every render. Putting this in a custom hook keeps `App.jsx` clean.
- **What calls it:** `App` calls `useSimulationLoop(...)` during its render.
- **Removable or combinable?** No. Moving this logic back into `App` directly would make `App` significantly longer and harder to read.

**`loop`** — line 56 (defined inside `useSimulationLoop`'s third `useEffect`)

- **What it does:** The actual `requestAnimationFrame` callback. On each frame, computes how much real time passed, adds it to an accumulator, and processes as many fixed 1/24-second physics ticks as the accumulator holds. Dispatches to either `handlePlaybackStep` or `handleRecordingStep` based on mode, calls the React setters, then re-schedules itself.
- **Why it exists:** The frame accumulator pattern is what guarantees the simulation advances at a consistent physics rate regardless of monitor refresh rate. Without this function there is no animation.
- **What calls it:** Called initially by `requestAnimationFrame(loop)`, then re-schedules itself at the end of each execution.
- **Removable or combinable?** No. It's the only thing that drives the simulation forward in time.

---

## `src/App.jsx`

### State handlers

**`App`** — line 9

- **What it does:** The root React component. Declares all simulation state, calls `useSimulationLoop` to wire up the animation loop, defines six control functions, and returns the JSX that lays out the three child components.
- **Why it exists:** It's the single source of truth. All state lives here so that `Charts`, `Controls`, and `Simulation3D` are purely presentational.
- **What calls it:** `main.jsx`, via `<App />`.
- **Removable or combinable?** No. It's the root of the application.

**`reset`** — line 46

- **What it does:** Sets `simulation` back to all zeros, sets `playing` to false, resets `recordedData` to a single zeroed entry, and forces mode back to `"record"`.
- **Why it exists:** The Reset button needs to return the entire simulation to factory state — not just clear recorded data, but also zero out physics values. This coordinates all those state updates at once.
- **What calls it:** Passed to `Controls` as `onReset`.
- **Removable or combinable?** No. It's meaningfully different from `clearRecordedData` — combining them would force users to always lose their parameter settings when they clear data.

**`togglePlayPause`** — line 63

- **What it does:** Flips the `playing` boolean. Uses the functional updater form (`p => !p`) to ensure it always operates on the latest value.
- **Why it exists:** The play/pause button needs a single callback.
- **What calls it:** Passed to `Controls` as `onTogglePlayPause`.
- **Removable or combinable?** Could technically be an inline arrow function in the JSX, but keeping it named makes `App`'s JSX easier to scan. Not combinable with any other function.

**`switchMode`** — line 66

- **What it does:** Updates `data.selectedMode`. If switching to `"playback"`, also resets the simulation to the first recorded state and sets `playing` to false. If switching back to `"record"`, picks up from the last recorded state.
- **Why it exists:** Switching modes isn't just changing a label — it also moves the sprite to the right position. Without this, clicking the mode radio would change the label but leave the sprite in the wrong place.
- **What calls it:** Passed to `Controls` as `onModeChange`.
- **Removable or combinable?** No. The mode-transition logic doesn't overlap with any other function.

**`clearRecordedData`** — line 108

- **What it does:** Resets `recordedData` to a single entry seeded from the current simulation values (not from zero), resets `playbackTime` to zero, forces mode back to `"record"`, and resets `simulation.time` to zero while keeping the current position, velocity, and acceleration.
- **Why it exists:** The user may want to keep their parameter settings but start a fresh recording — different from a full reset.
- **What calls it:** Passed to `Controls` as `onClearRecordedData`.
- **Removable or combinable?** No. It preserves physics parameters the user configured, which `reset` does not.

**`handleSetPlaybackTime`** — line 119

- **What it does:** Receives a target time from a chart drag, updates `data.playbackTime`, calls `findClosestState`, and updates `simulation` to that snapshot immediately.
- **Why it exists:** Chart timeline scrubbing needs to seek instantly — dragging should move the sprite as the mouse moves, not on the next animation tick. This connects chart mouse events to both the playback time pointer and the live simulation state.
- **What calls it:** Passed to `Charts` as `onSetPlaybackTime`; called from `handleMouseMove` during chart drags in playback mode.
- **Removable or combinable?** No. It's the only place that bridges chart interaction to simulation state during scrubbing.

**`handleSimulationChange`** — line 133

- **What it does:** Merges the incoming `changes` object into the current `simulation` state. If the simulation time is at zero, it also updates the first entry in `recordedData` to reflect the new starting conditions.
- **Why it exists:** When the user changes a parameter before starting the simulation, the recorded-data array should reflect the new starting state. Without the `time === 0` guard, the first point on the chart would always show zero regardless of what the user configured.
- **What calls it:** Passed to `Controls` as `onSimulationChange`; called from each `PhysicsInput`'s `onChange` prop.
- **Removable or combinable?** No. No other function merges parameter changes into both the live simulation state and the initial recorded-data entry.

---

## `src/components/Simulation3D.jsx`

### Rendering

**`Simulation3D`** — line 7

- **What it does:** Renders a React Three Fiber `Canvas` with an orthographic camera, a horizontal ground plane, 21 ruler tick marks (alternating tall/short at even/odd meter positions), a red center marker at zero, and an orange sprite whose horizontal position is set to `props.position`. Below the canvas it renders HTML meter labels from -10 to 10.
- **Why it exists:** This is the visual representation of the object moving in 1D space. Without it, the simulation would have no spatial display — only numbers and charts.
- **What calls it:** `App` renders `<Simulation3D position={simulation.position} />`.
- **Removable or combinable?** No. It's the only visual representation of the object's position in space.

---

## `src/components/Charts.jsx`

### Rendering helpers

**`Charts`** — line 28

- **What it does:** Renders a column of up to three Chart.js `Line` charts (position, velocity, acceleration vs. time), each with a live value display and a hide/show toggle. Manages local state for drag-scrubbing and which graphs are visible. Attaches mouse event handlers for timeline scrubbing in playback mode.
- **Why it exists:** The charts are how the user sees the full history of the motion.
- **What calls it:** `App` renders `<Charts data={data} simulation={simulation} onSetPlaybackTime={handleSetPlaybackTime} />`.
- **Removable or combinable?** No. It's the only component responsible for graph visualization.

**`buildChartData`** — line 39

- **What it does:** Takes a key name (e.g. `"position"`) and a color string, maps the `recordedData` array into the `{ x, y }` format Chart.js expects, and returns the full dataset object.
- **Why it exists:** Called three times — once per graph. Without it, the same array-mapping logic would have to be written out three times in the JSX with only the key and color changed.
- **What calls it:** Called directly in the JSX return of `Charts`, once per visible graph.
- **Removable or combinable?** No. It's parameterized to serve three different graphs.

**`handleMouseDown`** — line 57

- **What it does:** When the user presses the mouse button on the chart area in playback mode with recorded data present, sets `isDragging` to true and calls `preventDefault()` to stop text selection during the drag.
- **Why it exists:** Starts the drag-scrub gesture. Without it, moving the mouse while holding the button would not trigger scrubbing.
- **What calls it:** Attached as `onMouseDown` on the outer div wrapping all three charts.
- **Removable or combinable?** No. It handles a distinct browser event (mousedown) that initiates a gesture.

**`handleMouseMove`** — line 69

- **What it does:** While `isDragging` is true in playback mode, identifies which chart canvas the mouse is over, uses that chart's own scale to convert the pixel x-position into a time value, clamps it to the valid range, and calls `onSetPlaybackTime` with the result.
- **Why it exists:** This is what actually performs the scrub — every mouse-move during a drag produces a new time value and seeks the simulation.
- **What calls it:** Attached as `onMouseMove` on the outer chart div.
- **Removable or combinable?** No. It handles a distinct event (`mousemove`) and depends on `isDragging` being set by `handleMouseDown` first.

**`handleMouseUp`** — line 96

- **What it does:** Sets `isDragging` to false, ending the drag-scrub gesture.
- **Why it exists:** Without this, once the mouse button is pressed, `isDragging` would stay `true` forever.
- **What calls it:** Attached as both `onMouseUp` and `onMouseLeave` on the outer chart div. `onMouseLeave` ensures dragging stops if the mouse exits the component while the button is held.
- **Removable or combinable?** No. It handles a separate browser event and has the opposite effect of `handleMouseDown`.

**`getChartOptions`** — line 101

- **What it does:** Builds and returns the complete Chart.js options object for a single chart — turns off animation, sets x-axis range from 0 to `maxTime`, configures tooltip formatting, sets zoom/pan limits, and adds the vertical annotation line marking `simulation.time`.
- **Why it exists:** All three charts share the same configuration. It must be a function (not a constant object) because it reads `maxTime` and `simulation.time`, which change with each render.
- **What calls it:** Called three times in the JSX return of `Charts`, once per chart instance.
- **Removable or combinable?** No. It must be a function because it reads two runtime variables, and it's called three times so it can't be inlined.

---

## `src/components/Controls.jsx`

### Rendering

**`PhysicsInput`** — line 8

- **What it does:** A sub-component that renders one labeled physics parameter: a text box, a range slider, and min/max labels. Keeps its own local string state and a `lastValid` ref. Syncs the text when the external `value` prop changes (e.g., on reset). Calls `commit` when the user finishes editing.
- **Why it exists:** The simulation has three inputs (position, velocity, acceleration) that all work identically. Without this sub-component, the same input pattern — local string state, blur/Enter commit, external sync effect — would have to be written out three times in full.
- **What calls it:** `Controls` renders three instances of `<PhysicsInput>`, one for each physics parameter.
- **Removable or combinable?** No. Used three times with different props; removing it would require duplicating its logic three times.

**`commit`** — line 17 (defined inside `PhysicsInput`)

- **What it does:** Takes the raw string currently in the text box, passes it to `evaluateExpression`, and if the result is a valid number, updates the text display, the `lastValid` ref, and calls `onChange` to propagate the value up. If evaluation fails, reverts the text box to the last known valid value.
- **Why it exists:** It's the "commit point" — the moment when a user's free-form text becomes a real number the simulation can use. Without it, typing `"-"` or leaving the box empty would propagate `null` or `NaN` into the physics state.
- **What calls it:** The `onBlur` handler of the text input, and indirectly by the Enter key (which triggers blur).
- **Removable or combinable?** No. It's the only place that validates and commits text-input values for a given `PhysicsInput` instance.

**`Controls`** — line 63

- **What it does:** Renders the entire right-side control panel: three `PhysicsInput` fields wired to position, velocity, and acceleration; a mode radio group (Record / Playback); a play/pause button; and Clear and Reset All buttons. Holds no state of its own — all interactions are reported upward through callback props.
- **Why it exists:** It groups all user-facing controls into one panel, keeping that layout and button wiring separate from the physics logic in `App`.
- **What calls it:** `App` renders `<Controls ...props />`.
- **Removable or combinable?** No. It's the sole owner of the control panel layout.

---

## Reference table

| File | Functions |
|---|---|
| `src/utils/formatNumber.js` | `formatNumber` |
| `src/engine/evaluateExpression.js` | `evaluateExpression` |
| `src/engine/kinematics1d.js` | `calculatePhysicsStep` |
| `src/engine/playback.js` | `findClosestState`, `handlePlaybackStep`, `handleRecordingStep` |
| `src/hooks/useSimulationLoop.js` | `useSimulationLoop`, `loop` |
| `src/App.jsx` | `App`, `reset`, `togglePlayPause`, `switchMode`, `clearRecordedData`, `handleSetPlaybackTime`, `handleSimulationChange` |
| `src/components/Simulation3D.jsx` | `Simulation3D` |
| `src/components/Charts.jsx` | `Charts`, `buildChartData`, `handleMouseDown`, `handleMouseMove`, `handleMouseUp`, `getChartOptions` |
| `src/components/Controls.jsx` | `PhysicsInput`, `commit`, `Controls` |
| `src/main.jsx` | *(none)* |
| **Total** | **25** |
