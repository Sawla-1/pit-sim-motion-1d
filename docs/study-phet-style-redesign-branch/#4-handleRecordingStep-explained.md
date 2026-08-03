# Logic #4 Explained: `handleRecordingStep`

File: `src/engine/recordPlayback.js:19-26`

## 1. What does `handleRecordingStep` do?

### Quick Note

It moves the simulation forward one tick (using #1), then packages that moment into a timestamped snapshot ready to be saved into the recording.

### Answer

```js
export function handleRecordingStep(simulation, deltaTime) {
  const newSimulation = calculatePhysicsStep(simulation, deltaTime);

  return {
    simulation: newSimulation,
    recordedState: newSimulation,
  };
}
```

- **Inputs:** `simulation = { position, velocity, acceleration, time }` (the state *before* this tick), plus `deltaTime` (seconds elapsed).
- **Output:** an object with two things:
  - `simulation` — the advanced state, straight from `calculatePhysicsStep` (#1).
  - `recordedState` — the exact same object as `simulation` (not a copy, not reshaped). It's returned twice under two names because the two callers care about it for different reasons: one updates the live "now" state, the other appends a point to history.

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

## 3. Why there's no separate "build the snapshot" step anymore

### Quick Note

An older version of this function built a second, hand-written object (`newRecordedState`) just for the recording. That's gone now — `recordedState` is just `newSimulation` itself.

### Answer

Previously the function looked like this:

```js
const newRecordedState = {
  time: newSimulation.time,
  position: newSimulation.position,
  velocity: newSimulation.velocity,
  acceleration: newSimulation.acceleration,
};

return {
  simulation: newSimulation,
  recordedState: newRecordedState,
};
```

The idea was to keep the recorded-history shape independent from the live `simulation` shape, in case `simulation` ever grew extra fields that shouldn't leak into the recording. But `simulation`'s shape is a fixed contract documented in `CLAUDE.md` — always exactly `{ position, velocity, acceleration, time }` — so the two objects were always identical in value. Building a second object was copying data that was already right there.

That's why it was simplified to what you see today: `recordedState: newSimulation` — no separate object, no field-by-field copy. This matches the project's broader philosophy of removing abstractions that aren't earning their keep (see the CLAUDE.md guidance on evaluating changes through "would simulation #2 need this?" — here, the answer was no).

One side effect: the old version's `acceleration` field read from `simulation.acceleration` (pre-step) rather than `newSimulation.acceleration` (post-step) — a subtle before/after distinction that no longer exists, since there's only one object now (`newSimulation`) and both `simulation` and `recordedState` inside it read the same post-step value.

## 4. Step 2 — return both pieces

### Answer

```js
return {
  simulation: newSimulation,
  recordedState: newSimulation,
};
```

`handleRecordingStep` hands back two separate things in one object:

| Key | Shape | Used for |
|---|---|---|
| `simulation` | `{ position, velocity, acceleration, time }` | becomes the new "live" simulation state |
| `recordedState` | same object as `simulation` (`{ position, velocity, acceleration, time }`) | gets appended to the `recordedData` array |

It does **not** append anything itself, and it does **not** call `setState` of any kind — it just computes both values and returns them. Appending to the array and updating React state happens one layer up.

## 5. Full numeric example

Starting at rest, with acceleration `2`, stepping by `deltaTime = 0.5`:

```js
const simulation = { position: 0, velocity: 0, acceleration: 2, time: 0 };

handleRecordingStep(simulation, 0.5)
// → {
//     simulation:    { position: 0.25, velocity: 1, acceleration: 2, time: 0.5 },
//     recordedState: { position: 0.25, velocity: 1, acceleration: 2, time: 0.5 }, // same object as `simulation` above
//   }
```

Call it again with the returned `simulation` as the next input (`deltaTime = 0.5` again):

```js
handleRecordingStep({ position: 0.25, velocity: 1, acceleration: 2, time: 0.5 }, 0.5)
// → {
//     simulation:    { position: 1, velocity: 2, acceleration: 2, time: 1 },
//     recordedState: { position: 1, velocity: 2, acceleration: 2, time: 1 }, // same object as `simulation` above
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
