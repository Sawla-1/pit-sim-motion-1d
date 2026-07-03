# Lesson 12: Full Picture — End-to-End Data Flow

**Placement note:** This is the final lesson because it synthesizes ALL prior lessons. It would be meaningless at any earlier point. Each lesson taught you one piece of the machine in detail. Now we step back and watch the entire machine run. Think of it as the guide who, after showing you every room in the museum, takes you to the balcony to see how they all connect.

---

## 0. Why This Lesson Is Last

Everything you learned in Lessons 1–11 was preparation for this moment. Lesson 1 explained components. Lesson 2 explained state. Lesson 3 explained how data flows down and events flow up. Lesson 4 explained refs. Lesson 5 explained effects. Lesson 6 explained why the loop must read from refs and not state. Lesson 7 explained the animation loop. Lesson 8 explained the fixed timestep. Lesson 9 explained the 3D scene. Lessons 10 and 11 explained the charts. This lesson traces four complete user interactions from the first mouse click to the last pixel update, naming every concept as it appears. If a step is confusing, the lesson number in parentheses tells you exactly where to go back and review.

---

## 1. Reconnecting to Lesson 0

In Lesson 0 you saw this diagram:

```
+------------+       props        +------------------+
|  Controls  | ----------------> |  Simulation3D    |
|  (inputs,  |                   |  (3D ruler +     |
|  buttons)  |                   |   moving sprite) |
+-----+------+                   +------------------+
      |
      | callbacks
      v
+----------------------------------+
|            App.jsx               |
|   (holds ALL state — simulation, |
|    playing, data)                |
+--------+-----------+-------------+
         |           ^
   props |           | setSimulation / setData
         v           |
+------------+   +---------------------------+
|  Charts    |   |  useSimulationLoop        |
|  (graphs,  |   |  (physics loop, RAF,      |
|  scrubbing)|   |   fixed timestep)         |
+-----+------+   +---------------------------+
      |
      | onSetPlaybackTime callback
      +-----> App.jsx
```

You could name every box then. Now you can explain every arrow.

- The arrow from Controls to Simulation3D is not a direct connection — they share a common parent (App). Both receive the same `simulation` state as props. When App re-renders, both children update simultaneously.
- The arrow from useSimulationLoop upward represents `setSimulation` and `setData` calls that push new physics values into App's state.
- The arrow from Charts upward represents the `onSetPlaybackTime` callback being called when the user drags on a chart.
- The arrow from App downward to Charts and Controls and Simulation3D is the prop flow — state flowing down to all children.

---

## 2. Four Complete Flows

### Flow A — User Types a New Velocity Value

The user clicks on the velocity input in the Controls panel and types "5".

1. The `PhysicsInput` component inside `Controls.jsx` owns a local `text` state variable (Lesson 2, useState). As the user types each character, `onChange={(e) => setText(e.target.value)}` updates `text`. The input box shows what the user is typing in real time.

2. The user presses Enter or clicks away. The `commit` function runs. It calls `evaluateExpression("5")`, which returns the number `5`. The input is valid.

3. `commit` calls `onChange(5)`, which is the `onChange` prop passed to `PhysicsInput`. This is `(v) => onSimulationChange({ velocity: v })` in `Controls` (Lesson 3, callbacks up).

4. `onSimulationChange({ velocity: 5 })` is the `handleSimulationChange` function in `App.jsx`. It calls `setSimulation(prev => ({ ...prev, velocity: 5 }))` (Lesson 2, object state with spread).

5. App re-renders with the new `simulation` object (Lesson 2, state triggers re-render). All children receive updated props:
   - `Simulation3D` receives `position={simulation.position}` — unchanged, sprite does not move.
   - `Charts` receives `simulation={simulation}` — the velocity readout updates.
   - `Controls` receives `simulation={simulation}` with the new velocity.

6. Inside `PhysicsInput`, the `useEffect` that syncs the external value runs (Lesson 5, useEffect with [value] dep): `setText(String(5))` and `lastValid.current = 5` confirm the field is in sync.

7. In `useSimulationLoop`, `simulationRef.current = simulation` runs during the re-render (Lesson 6, mirror ref), so the next RAF callback will read the new velocity if recording starts.

**Summary of lessons touched:** useState (L2), lifting state (L3), callbacks up (L3), object state (L2), re-render propagation (L2), useEffect sync (L5), mirror ref update (L6).

---

### Flow B — User Hits Play in Record Mode

The simulation is paused. The user clicks the play button in Controls.

1. The play button's `onClick` is `onTogglePlayPause` (Lesson 3, callback prop). This calls `togglePlayPause` in App: `setPlaying(p => !p)` (Lesson 2, functional update).

2. `playing` changes from `false` to `true`. App re-renders. All children receive updated `playing` prop.

3. In `Controls`, the play button's icon changes from "▶" to "❚❚" because `playing` is now `true`.

4. In `useSimulationLoop`, the `useEffect` that contains the RAF loop has `playing` in its dependency array (Lesson 5, useEffect with deps; Lesson 6, using deps to handle stale closures for `playing`). The old RAF loop is cancelled via its cleanup function (`cancelAnimationFrame(raf)`) and a new loop starts with a fresh closure that captures `playing = true`.

5. The new `accumulator` starts at `0`. `last.current` holds the timestamp from the previous frame (it is a ref, not reset on effect restart) (Lesson 4, useRef surviving re-renders).

6. The RAF fires (Lesson 7, requestAnimationFrame). `frameTime` is computed from `last.current`. The accumulator accumulates time.

7. After about 41.67ms of real time, `accumulator >= FIXED_TIMESTEP` becomes true (Lesson 8, fixed timestep at 1/24 second).

8. The `while` loop executes. It reads `simulationRef.current` and `dataRef.current` (Lesson 6, mirror ref pattern — these always hold the latest state).

9. `dat.selectedMode === "record"`, so `handleRecordingStep(sim, FIXED_TIMESTEP, realElapsedTime)` runs (from `src/engine/playback.js`). This calls `calculatePhysicsStep` (from `src/engine/kinematics1d.js`) with the current position, velocity, acceleration, and `deltaTime = 1/24`. The average-velocity method computes new position and velocity.

10. `setSimulation(result.simulation)` is called with the new physics snapshot (Lesson 2). App re-renders. The 3D sprite moves to the new position (Lesson 9, reactive R3F props). The current value readouts on the charts update.

11. `setData(prev => ({ ...prev, recordedData: [...prev.recordedData, result.recordedState] }))` appends the new snapshot to the growing array (Lesson 2, functional state update). Charts re-renders with the new data, drawing the growing line (Lesson 10, Chart.js update from props).

12. The annotation cursor updates because `simulation.time` changed (Lesson 11, annotation from props).

13. Step 6 repeats: `raf = requestAnimationFrame(loop)` schedules the next frame.

**Summary:** useState (L2), callbacks (L3), useEffect deps (L5), RAF loop (L7), fixed timestep (L8), mirror refs (L6), pure physics (kinematics1d.js), R3F reactive props (L9), Chart.js prop update (L10), annotation (L11).

---

### Flow C — User Switches to Playback and Drags on a Chart

Recording has been stopped. The user selects the Playback radio button, then clicks and drags on the position chart.

1. The user clicks the Playback radio button. `onModeChange("playback")` callback fires (Lesson 3). `switchMode("playback")` runs in App. It calls `setData(prev => ({ ...prev, selectedMode: "playback" }))` and resets `playbackTime` to `0`. `setPlaying(false)` ensures the loop is paused (Lesson 2).

2. `dataRef.current` updates with the new `selectedMode` during the next render (Lesson 6, mirror ref assigned on every render).

3. The user presses the mouse button down on the position chart canvas. The `onMouseDown` handler in `Charts.jsx` fires (Lesson 1, event handlers). It checks `event.target.tagName === "CANVAS"` and `data.selectedMode === "playback"`. Both are true. `setIsDragging(true)` (Lesson 2, local state in Charts).

4. The user moves the mouse. `onMouseMove` fires. It finds the correct chart instance in `chartRefs.current` by matching `items.canvas === event.target` (Lesson 4, refs to chart instances).

5. It computes the x-position in pixels: `const x = event.clientX - canvas.getBoundingClientRect().left`. Then converts to a time value: `const timeValue = chart.scales.x.getValueForPixel(x)` — this is the imperative Chart.js API call (Lesson 10, why chartRefs are needed). The time is clamped to the valid range.

6. `onSetPlaybackTime(clampedTime)` fires (Lesson 3, callback up to App). This is `handleSetPlaybackTime` in App. It calls `setData(prev => ({ ...prev, playbackTime: clampedTime }))` (Lesson 2).

7. It also immediately calls `findClosestState(data.recordedData, clampedTime)` — a linear search through the recorded snapshots — and calls `setSimulation` with the closest snapshot (Lesson 2).

8. App re-renders. The 3D sprite moves to the historical position (Lesson 9, R3F reactive prop). The annotation cursor on all three charts moves to the new `simulation.time` (Lesson 11). The value readouts on the charts update to the historical values.

9. `dataRef.current` updates with the new `playbackTime` (Lesson 6, mirror ref).

10. If the user released the mouse button, `handleMouseUp` sets `isDragging` to `false` (Lesson 2, local state). Dragging stops.

**Summary:** useState (L2), lifting state (L3), callbacks (L3), useRef for chart instances (L4), Chart.js imperative API (L10), R3F reactive props (L9), annotation (L11), mirror ref update (L6).

---

### Flow D — User Hits Reset

The user clicks the "Reset All" button.

1. `onReset` callback fires (Lesson 3). `reset()` runs in App.

2. `setSimulation({ position: 0, velocity: 0, acceleration: 0, time: 0 })` resets the physics snapshot to zero (Lesson 2, useState setter with a new object).

3. `setPlaying(false)` ensures the simulation is paused (Lesson 2).

4. `setData(prev => ({ ...prev, recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }], playbackTime: 0, selectedMode: "record" }))` clears the recorded data back to a single initial point and resets mode to record (Lesson 2, functional state update with spread).

5. App re-renders. `simulationRef.current` and `dataRef.current` are updated to the new zero-state values (Lesson 6, mirror refs updated during render).

6. Because `time === 0`, the `useEffect` in `useSimulationLoop` that watches `[time]` fires (Lesson 5, useEffect with dep). It sets `recordRealTimeStart.current = null` and `recordPauseStartTime.current = null` (Lesson 4, writing to refs). The recording clock is cleared, ready for a fresh start.

7. `Simulation3D` re-renders with `position={0}`. The orange sprite snaps back to the center of the ruler (Lesson 9, R3F reactive props).

8. `Charts` re-renders with `data.recordedData` containing only the single initial point. The graph lines shrink back to a single point at the origin (Lesson 10, Chart.js update from props). The annotation cursor sits at `simulation.time = 0` (Lesson 11).

9. In each `PhysicsInput` inside `Controls`, the `useEffect` that watches `[value]` fires (Lesson 5, useEffect with dep). `setText("0")` and `lastValid.current = 0` update each input box to show `0` (Lesson 4, ref; Lesson 2, local state in child). The input boxes now show `0` for all three parameters.

**Summary:** callbacks (L3), useState (L2), mirror refs (L6), useEffect with dep (L5), useRef for timing and last-valid (L4), R3F reactive props (L9), Chart.js update (L10), annotation (L11), child useEffect sync (L5).

---

## 3. The Architecture in One Sentence

App holds all truth; the loop reads refs to avoid stale closures; components render from props; callbacks lift events back up.

Every design decision in this codebase follows from that sentence:
- Why is all state in App? Because App is the single source of truth — "App holds all truth."
- Why do refs exist in the loop? Because the RAF callback would otherwise read stale state — "reads refs to avoid stale closures."
- Why are Controls and Charts purely presentational? Because they only render from what they receive — "components render from props."
- Why does onSetPlaybackTime exist? Because Charts cannot modify App's state directly — "callbacks lift events back up."

---

## 4. You Now Understand This Project

Work through this checklist. If any item feels uncertain, the lesson number tells you exactly where to review:

- [ ] React components receive props and return JSX (Lesson 1)
- [ ] useState stores values that trigger re-renders when they change (Lesson 2)
- [ ] Lifting state keeps one source of truth; callbacks bring events upward (Lesson 3)
- [ ] useRef stores values without triggering re-renders (Lesson 4)
- [ ] useEffect runs side effects after render, with cleanup for long-lived operations (Lesson 5)
- [ ] The mirror ref pattern prevents stale closures in long-lived callbacks (Lesson 6)
- [ ] requestAnimationFrame runs synchronized callbacks once per display frame (Lesson 7)
- [ ] The fixed timestep accumulator decouples physics from display refresh rate (Lesson 8)
- [ ] React Three Fiber renders 3D scenes declaratively from props (Lesson 9)
- [ ] Chart.js with react-chartjs-2 renders data-driven line graphs from props (Lesson 10)
- [ ] The annotation plugin draws a time cursor on top of each chart (Lesson 11)

---

## 5. What to Read Next

Now open the actual source files and trace the code against what you learned here. Suggested order:

1. `src/App.jsx` — find the three `useState` calls. Find `handleSimulationChange`, `handleSetPlaybackTime`, `reset`. Find where `useSimulationLoop` is called. Find where each callback is passed to each child.

2. `src/hooks/useSimulationLoop.js` — find the two mirror ref assignments at the top. Find the three `useEffect` calls and identify what each one is responding to. Find the accumulator pattern and the `FIXED_TIMESTEP` constant. Find the record/playback dispatch inside the while loop.

3. `src/engine/kinematics1d.js` — read `calculatePhysicsStep`. It is 10 lines. Find the average-velocity formula: `avgVelocity = (oldVelocity + newVelocity) / 2`. This is exact for constant acceleration.

4. `src/engine/playback.js` — read `handleRecordingStep` and `handlePlaybackStep`. These are pure functions — no React, no side effects.

5. `src/components/Controls.jsx` — find `PhysicsInput`. Identify its local `text` state, `lastValid` ref, and `useEffect` that syncs with the `value` prop. Find how `commit` calls `onChange`.

6. `src/components/Charts.jsx` — find `buildChartData`. Find `chartRefs` and how it is used in `handleMouseMove`. Find the annotation object in `getChartOptions`.

7. `src/components/Simulation3D.jsx` — notice it is less than 100 lines. Find the orange sprite and its `position={[position, 0, 0]}` prop. Confirm: no state, no effects, no logic.

If you can read every file without getting lost, this curriculum has done its job. Welcome to the codebase.
