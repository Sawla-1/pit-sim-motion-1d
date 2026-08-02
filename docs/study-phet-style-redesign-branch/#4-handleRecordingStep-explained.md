# Logic #4 Explained: `handleRecordingStep`

File: `src/engine/recordPlayback.js:19-34`

## 1. What does `handleRecordingStep` do?

### Quick Note

It moves the simulation forward one tick (using #1), then packages that moment into a timestamped snapshot ready to be saved into the recording.

### Answer

```js
export function handleRecordingStep(simulation, deltaTime) {
  const newSimulation = calculatePhysicsStep(simulation, deltaTime);

  // Create new recorded state
  const newRecordedState = {
    time: newSimulation.time,
    position: newSimulation.position,
    velocity: newSimulation.velocity,
    acceleration: simulation.acceleration,
  };

  return {
    simulation: newSimulation,
    recordedState: newRecordedState,
  };
}
```

- **Inputs:** `simulation = { position, velocity, acceleration, time }` (the state *before* this tick), plus `deltaTime` (seconds elapsed).
- **Output:** an object with two things:
  - `simulation` — the advanced state, straight from `calculatePhysicsStep` (#1).
  - `recordedState` — a snapshot of that same moment, shaped for the recording history.

It's a **pure function**, same style as `calculatePhysicsStep` (#1) and `evaluateExpression` (#3) — same inputs always give the same outputs, no side effects.

## 2. Step 1 — advance physics via `calculatePhysicsStep` (#1)

### Quick Note

This is the whole reason #1 had to be learned first: `handleRecordingStep` is a thin wrapper around it.

### Answer

```js
const newSimulation = calculatePhysicsStep(simulation, deltaTime);
```

All the actual motion math — `v = v0 + a·t`, average-velocity position update — happens inside `calculatePhysicsStep`. `handleRecordingStep` doesn't reimplement or touch any of that; it just calls it and gets back the new `{ position, velocity, time, acceleration }`.

```js
calculatePhysicsStep({ position: 0, velocity: 0, acceleration: 2, time: 0 }, 0.5)
// → { position: 0.25, velocity: 1, time: 0.5, acceleration: 2 }
```

## 3. Step 2 — build the recorded snapshot

### Quick Note

This is where `recordedData` — the array that #5 (playback) and #10 (Charts) both depend on — gets its individual points.

### Answer

```js
const newRecordedState = {
  time: newSimulation.time,
  position: newSimulation.position,
  velocity: newSimulation.velocity,
  acceleration: simulation.acceleration,
};
```

Three of the four fields (`time`, `position`, `velocity`) come from `newSimulation` — the state *after* stepping. The fourth, `acceleration`, comes from `simulation` — the state *before* stepping.

```js
newSimulation.time         // 0.5   ← after
newSimulation.position     // 0.25  ← after
newSimulation.velocity     // 1     ← after
simulation.acceleration    // 2     ← before (not newSimulation.acceleration)
```

### Subtlety: old `acceleration`, not new

`recordedState.acceleration` reads from `simulation.acceleration` (the pre-step value), not `newSimulation.acceleration` (the post-step value). Looking at `calculatePhysicsStep` (#1):

```js
return {
  position: newPosition,
  velocity: newVelocity,
  time: newTime,
  acceleration: simulation.acceleration, // passed through unchanged
};
```

`calculatePhysicsStep` never changes `acceleration` on its own — it just copies the input through. So today, `simulation.acceleration === newSimulation.acceleration` always, and this choice is harmless. But it's worth flagging: if a future simulation ever let `calculatePhysicsStep` *change* acceleration mid-step (e.g. drag, collisions), this line would start silently recording the acceleration from *before* that change instead of after it — a subtle bug baked in by which object it happens to read from.

## 4. Step 3 — return both pieces

### Answer

```js
return {
  simulation: newSimulation,
  recordedState: newRecordedState,
};
```

`handleRecordingStep` hands back two separate things in one object:

| Key | Shape | Used for |
|---|---|---|
| `simulation` | `{ position, velocity, acceleration, time }` | becomes the new "live" simulation state |
| `recordedState` | `{ time, position, velocity, acceleration }` | gets appended to the `recordedData` array |

It does **not** append anything itself, and it does **not** call `setState` of any kind — it just computes both values and returns them. Appending to the array and updating React state happens one layer up.

## 5. Full numeric example

Starting at rest, with acceleration `2`, stepping by `deltaTime = 0.5`:

```js
const simulation = { position: 0, velocity: 0, acceleration: 2, time: 0 };

handleRecordingStep(simulation, 0.5)
// → {
//     simulation:    { position: 0.25, velocity: 1, acceleration: 2, time: 0.5 },
//     recordedState: { time: 0.5, position: 0.25, velocity: 1, acceleration: 2 },
//   }
```

Call it again with the returned `simulation` as the next input (`deltaTime = 0.5` again):

```js
handleRecordingStep({ position: 0.25, velocity: 1, acceleration: 2, time: 0.5 }, 0.5)
// → {
//     simulation:    { position: 1, velocity: 2, acceleration: 2, time: 1 },
//     recordedState: { time: 1, position: 1, velocity: 2, acceleration: 2 },
//   }
```

Each call produces one more `recordedState` — that's one more point in the recording.

## 6. Why this matters for `useSimulationLoop.js` / `App.jsx`

### Quick Note

`handleRecordingStep` only computes — it never loops and never touches React state. Someone else has to call it repeatedly and actually store the results.

### Answer

`handleRecordingStep` is called once per animation frame while recording, but the looping and state-updating live one layer up:

- `useSimulationLoop.js` runs the `requestAnimationFrame` loop and calls `onRecordStep` each tick (App.jsx wires this to `handleRecordingStep`).
- `App.jsx` takes the returned `{ simulation, recordedState }` and does the actual mutation:
  - `setSimulation(simulation)` — updates the live physics snapshot.
  - appends `recordedState` onto `data.recordedData` via `setData`.

So `handleRecordingStep` itself never grows `recordedData` — it just produces the one new point each time it's asked. The array only exists, and only grows, because `App.jsx` keeps calling this function and keeps appending what comes back.

### Extra Tips

Per `logic-study-order.md`, #4 directly wraps #1, which is why #1 (`calculatePhysicsStep`) had to be learned first. #4 is also the point where `recordedData` is introduced — #5 (`interpolateStateAtTime` / playback) and #10 (`Charts.jsx`) both consume the array that this function's `recordedState` output feeds into, so neither of those can be understood without knowing what shape each point in `recordedData` has.
