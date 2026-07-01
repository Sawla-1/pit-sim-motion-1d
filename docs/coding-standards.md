# Coding Standards Reference Guide
## 1D Motion Simulation — React + Vite

---

## Section 1: State

### Where state should live and how to group it

**One rule:** If a piece of data controls what shows up on screen and it needs to be shared between components, it lives in `App.jsx`. Everything else lives as close to where it is used as possible.

In this project, `App.jsx` owns two state objects and one boolean:

```js
const [simulation, setSimulation] = useState({ position, velocity, acceleration, time });
const [data, setData] = useState({ recordedData, selectedMode, playbackTime });
const [playing, setPlaying] = useState(false);
```

**Why `simulation` is one object:** The physics engine always produces all four values together on every tick — velocity changes, position changes, and time advances as one unit. If you split them into four separate `useState` calls, you would trigger four re-renders instead of one. Grouping them into one object means one setter, one re-render.

**Why `data` is a separate object from `simulation`:** `simulation` is the live physics snapshot — it changes 24 times per second. `data` is session-level state — it tracks the recording array, which mode you're in, and where playback is. They change for different reasons and on different schedules. Keeping them separate makes it easy to see which kind of state a function is touching.

**Why `playing` is separate from both:** It is a single boolean toggled by the user. Putting it inside `simulation` would mean the physics engine sees it (it doesn't need to). Putting it inside `data` would mean recording/playback logic sees it (it sees it through the hook's parameter instead). Keeping it separate makes the dependency explicit and clean.

**Why `PhysicsInput` has local `text` state:** The string `"-1."` that a user is typing mid-input is not a physics value. The simulation should never see `"-1."`. `PhysicsInput` holds `text` locally so the user can type freely. Only when they blur or press Enter does a validated number get sent up to `App`. This is local UI state — no other component cares about it.

**Why `visibility` and `isDragging` in `Charts.jsx` are local:** Nothing outside `Charts` needs to know which graphs are hidden or whether the user is dragging. Keeping them local means `App` stays simple and `Charts` manages its own interaction state.

**The grouping rule in plain English:** Group values that always change together as one `useState`. Separate values that change independently or for different reasons. Local UI state that no other component needs stays local.

---

### Naming conventions

**State variables** — use plain descriptive nouns. Describe what the data is, not what it does:

```js
const [simulation, ...] = useState(...)   // correct — names the data
const [physicsRunner, ...] = useState()   // wrong — names the behavior
```

**Setter functions** — always `setX` where `X` matches the state variable name exactly:

```js
setSimulation(...)    // matches simulation
setData(...)          // matches data
setPlaying(...)       // matches playing
```

**Handler functions** — use `handleX` for functions defined in `App` that contain logic:

```js
const handleSetPlaybackTime = (newTime) => { ... }
const handleSimulationChange = (changes) => { ... }
```

**Callback props** — use `onX` for props passed down to children. The child calls `onX`, which triggers the parent's `handleX`:

```js
// App.jsx passes down:
<Controls onSimulationChange={handleSimulationChange} onReset={reset} />

// Controls.jsx calls up:
onChange={(v) => onSimulationChange({ velocity: v })}
```

This naming pattern makes data flow easy to read: `on` is what a child can call, `handle` is what `App` does when that happens.

---

### What NOT to use

Do not introduce `useReducer`, `useContext`, Zustand, or any state management library. This project has two state objects and one boolean in `App`. That is not complex enough to justify a reducer or a context provider.

The test is simple: if `App` is passing a prop through two or more intermediate components that do not use it, revisit. That is not the current situation.

---

## Section 2: Loop, Timing, Refs, and useEffect

### The requestAnimationFrame pattern

The loop lives in `useSimulationLoop.js`. Here is the structure stripped down to its key parts:

```js
useEffect(() => {
  let raf;
  let accumulator = 0;
  const FIXED_TIMESTEP = 1 / 24;

  function loop(now) {
    const frameTime = (now - last.current) / 1000;
    last.current = now;

    if (playing) {
      accumulator += frameTime;
      while (accumulator >= FIXED_TIMESTEP) {
        // run one physics step
        accumulator -= FIXED_TIMESTEP;
      }
    }
    raf = requestAnimationFrame(loop);
  }

  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}, [playing, setSimulation, setData, setPlaying]);
```

**What each piece does:**

- `last.current` — stores the timestamp of the previous frame so you can calculate how much real time passed.
- `accumulator` — collects elapsed time. When it builds up enough for a full physics step (1/24 of a second), you run a step and subtract. This decouples the display frame rate from the physics rate.
- `while (accumulator >= FIXED_TIMESTEP)` — if the browser was slow and a frame took 100ms, this runs 2–3 physics steps to catch up, not 1.
- `return () => cancelAnimationFrame(raf)` — the cleanup function. When `playing` changes, React runs this before starting the new effect. Without it, you get multiple loops running at once.
- `raf = requestAnimationFrame(loop)` inside `loop` — schedules the next frame. The loop continues as long as nothing cancels the ID.

---

### useRef vs useState

**The rule:** Use `useState` when changing the value should cause the screen to update. Use `useRef` when changing the value should NOT cause the screen to update.

| Value | Why ref, not state |
|---|---|
| `last.current` | Updated every animation frame — putting it in state would trigger 24+ re-renders per second |
| `raf` (the frame ID) | A bookkeeping number only needed for cleanup — not displayed anywhere |
| `recordRealTimeStart.current` | Used only in timing math inside the loop — the timer display reads from `simulation.time` in state instead |
| `recordPauseStartTime.current` | Stamped when you pause, read when you resume — never displayed directly |
| `simulationRef.current` | The "mirror ref" — explained below |

**The mirror ref pattern** — `simulationRef` and `dataRef` in `useSimulationLoop.js`:

```js
const simulationRef = useRef(simulation);
simulationRef.current = simulation;  // updated outside the effect, every render
```

The RAF callback is a closure. When the `useEffect` runs, it captures the values of `simulation` and `data` at that moment. On the next render, those captured values are stale. The mirror refs solve this: because refs are mutable objects shared across renders, updating `simulationRef.current` outside the effect means the loop always reads the latest value via `simulationRef.current` rather than the stale closure value.

---

### What useEffect is actually for

`useEffect` is for connecting React to something outside React — a timer, an animation loop, a browser event listener, a DOM measurement. It is also for running a side effect in response to a value changing when that side effect is not rendering.

**Use useEffect when:**
- You need to set up something that needs cleanup (RAF loops, event listeners, timers)
- A value changed and you need to do something that isn't rendering (like resetting a ref when `time` reaches zero)

**Do not use useEffect when:**
- You just need to compute a value for the render — do that inline in the component body

Examples from this project:

```js
// CORRECT: sets up the RAF loop and tears it down when playing changes
useEffect(() => {
  let raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}, [playing, ...]);

// CORRECT: reacts to time hitting zero by resetting timing refs (not state)
useEffect(() => {
  if (time === 0) {
    recordRealTimeStart.current = null;
    recordPauseStartTime.current = null;
  }
}, [time]);

// CORRECT: PhysicsInput syncs its local text when the prop changes from outside
useEffect(() => {
  setText(String(value));
  lastValid.current = value;
}, [value]);

// WRONG: computing something for rendering — just do it inline
useEffect(() => {
  setMaxTime(data.recordedData.at(-1)?.time ?? 0);
}, [data.recordedData]);
// Instead: const maxTime = data.recordedData.at(-1)?.time ?? 0;
```

---

### Common timing and ref mistakes

**Mistake 1: Reading stale state inside the RAF loop**

```js
// WRONG — simulation is captured once when the effect runs; it never updates
useEffect(() => {
  function loop() {
    const newPos = simulation.position + simulation.velocity * 0.016; // stale!
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}, [playing]);
```

`simulation` here is the value from the first render. Every physics step reads the same starting position and velocity. The simulation never advances correctly. Fix: use the mirror ref pattern (`simulationRef.current`).

**Mistake 2: Putting the RAF ID in state**

```js
// WRONG
const [rafId, setRafId] = useState(null);

function loop() {
  setRafId(requestAnimationFrame(loop)); // triggers a re-render every frame
}
```

Calling `setRafId` causes a re-render. A re-render while the loop is running reschedules the effect and can start a second loop. Use a plain `let raf` inside the effect, or a `useRef` if you need the ID accessible outside the effect.

**Mistake 3: Forgetting cleanup**

```js
// WRONG — no cleanup
useEffect(() => {
  requestAnimationFrame(loop);
}, [playing]);
```

Every time `playing` changes, a new loop starts. The old loop is never cancelled. After a few play/pause cycles you have multiple loops running simultaneously, each stepping physics independently.

---

## Section 3: Functions

### Already clean — correctly scoped

**`calculatePhysicsStep`** (`kinematics1d.js`) — Pure math, no React, no imports. Takes a simulation snapshot and a time step, returns a new snapshot. Can be tested without rendering anything.

**`findClosestState`** (`playback.js`) — Pure search function. Takes an array and a target time, returns the closest entry. One job, no side effects.

**`handleRecordingStep`** (`playback.js`) — Delegates the math to `calculatePhysicsStep`, packages the result into the format the loop needs. Clear wrapper with one job.

**`handlePlaybackStep`** (`playback.js`) — Checks for end of playback, finds the closest state, returns the result. No mutation. Clear and self-contained.

**`evaluateExpression`** (`evaluateExpression.js`) — Pure utility. Takes a string, returns a number or `null`. Sandboxed with `"use strict"` and a finite check. No side effects.

**`commit`** (inside `PhysicsInput`, `Controls.jsx`) — Correctly handles the validate-or-revert pattern. Evaluates input, calls `onChange` on success, resets to last valid on failure. Exactly the right amount of logic for one input.

**`clearRecordedData`** (`App.jsx`) — Resets the recording array to just the current simulation state and resets time to zero. Does exactly one thing, named accurately.

**`handleSetPlaybackTime`** (`App.jsx`) — Sets `playbackTime` in `data` and seeks `simulation` to the closest recorded state in one call. These two updates are always meant to happen together, so coupling them here is correct.

**`reset`** (`App.jsx`) — Resets every piece of state to its initial value. Clean and total. No conditional logic.

**`PhysicsInput`** component (`Controls.jsx`) — Correctly extracted. Owns its own `text` state, its own `lastValid` ref, and its own sync effect. Nothing about this component needs to be in the parent.

**`handleMouseDown` and `handleMouseUp`** (`Charts.jsx`) — Simple one-job event handlers. `handleMouseDown` sets `isDragging` after checking conditions; `handleMouseUp` clears it.

The three `useEffect` blocks in `useSimulationLoop.js` — each handles one timing concern. Timing reset, pause tracking, and the main loop are separated correctly. Combining them would create a single effect with complex branching that is harder to reason about.

---

### Could be simplified

**`togglePlayPause`** (`App.jsx`)

Current version has an if/else that just toggles a boolean:

```js
// Current
const togglePlayPause = () => {
  if (playing) { setPlaying(false); } else { setPlaying(true); }
};

// Simpler
const togglePlayPause = () => setPlaying(p => !p);
```

The functional form `p => !p` is also safer because it always toggles from the actual current value, not a closure-captured snapshot.

---

**`buildChartData`** (`Charts.jsx`)

Currently maps `recordedData` twice: first to an intermediate object with renamed properties (`x` for position, `v` for velocity), then again to pick just the one needed value. The renamed properties do not match the source names (`position`, `velocity`) or the Chart.js axis names, which adds confusion.

Simpler: one `.map()` going directly from a recorded state to `{ x: state.time, y: state[valueKey] }`. No intermediate object, no renamed aliases. The source property names are already clear.

---

**`getChartOptions`** (`Charts.jsx`)

The function signature is `getChartOptions(yLabel)`, but `yLabel` is never used inside the function body — it does not appear in the returned options object. A dead parameter misleads a reader into looking for where it is used.

Fix: either remove the parameter entirely, or actually use it to label the Y axis. Don't leave parameters that do nothing.

---

**`handleSimulationChange`** (`App.jsx`)

The condition `simulation.time === 0` reads from the closure. `setSimulation` uses the safer functional form (`prev =>`), but the data update does not. The safer pattern moves the time check inside the setter:

```js
setData((prev) => {
  if (simulation.time !== 0) return prev;
  return { ...prev, recordedData: [...] };
});
```

This is a correctness improvement at the edges (rapid successive calls), not a bug that currently fires — but it is the pattern to use going forward for consistency.

---

### Could be combined

No strong candidates in this codebase. Functions are already well-separated by concern. The closest worth noting: `getMaxTime()` in `Charts.jsx` is a no-argument function called in two places. Since it just reads the last element of `recordedData`, it could become a `const` at the top of the component:

```js
const maxTime = data.recordedData.length > 0
  ? data.recordedData[data.recordedData.length - 1].time
  : 0;
```

Computes once per render, removes one layer of indirection, and makes it immediately obvious what `maxTime` is.

---

### Could be removed entirely

**`getMaxTime()`** (`Charts.jsx`) — a no-argument function that only reads a value. Replace with a `const maxTime` computed once at the top of the component. Same result, one less thing to name and find.

---

## Section 4: Overall Philosophy Checklist

Use this before writing or adding any new code:

1. **New state variable?** Ask: "will changing this value need to update what the user sees?" If no, it is probably a ref. If yes, ask whether it fits an existing state object or is genuinely independent.

2. **New ref?** Use a ref for values that change on every animation frame, for timer/frame IDs, and for the mirror ref pattern where a callback needs the latest value but can't be in the effect's dependency array.

3. **New function?** Extract it only if you are writing the same logic in two places, or if a function body is so long that a meaningful name in the middle would help a reader orient themselves. One-liners are fine inline.

4. **New component?** Extract JSX into a component only if it has its own local state that doesn't belong in the parent, or if the same JSX appears in more than one place. `PhysicsInput` is the right model: it owns its own state and is reused multiple times.

5. **How to tell if something is too complex:** If you can't describe what a function does in one sentence, it is doing more than one thing. Split it.

6. **Physics never touches React. React never calculates physics.** `kinematics1d.js` has no React imports. `Simulation3D.jsx` has no physics math. Keep these boundaries.

7. **Data flows down as props. Events flow up as callbacks.** Children receive data and call `onX` functions. They do not reach up to modify parent state directly.

8. **Before adding a new abstraction** — a custom hook, a helper module, a new component — ask: "does this solve a problem I have right now in this code?" If the answer is "it might help later," stop. Write the simple version first.

9. **If the simple version breaks, then abstract.** Duplication is cheaper than the wrong abstraction. Two slightly-similar functions you understand are better than one generic function you have to decode every time.

10. **Add a comment when the why is not obvious.** The what is visible in the code. Comments explain decisions: why 24 FPS, why the mirror ref exists, why `handleSimulationChange` only updates `recordedData` when time is zero.
