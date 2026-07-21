# Typing into Velocity after Pause: `10` commits live, `recordedData` stays untouched

Companion to [velocity-input-explained.md](velocity-input-explained.md). That doc covers editing Velocity at `time === 0` (fresh mount, before Play). This one covers editing Velocity **after you've recorded some data and pressed Pause** — `simulation.time !== 0`. Same `commit()` pipeline, but one branch in `App.jsx` flips, with a real consequence: your edit no longer touches history, only the live state going forward.

## 0. Setup — you record for a bit, then pause

You set velocity = 2, acceleration = 1, press Play, let it record for a couple seconds, then press Pause. (Exact tick-by-tick math for how these numbers accumulate is in [one-tick-explained.md](one-tick-explained.md) and [second-tick-explained.md](second-tick-explained.md) — here we just take a snapshot after recording has been running a while.) Example state at the moment you pause:

```js
playing = false                                   // just pressed Pause
simulation = { position: 6, velocity: 4, acceleration: 1, time: 2 }
data.recordedData = [
  { time: 0,   position: 0, velocity: 2, acceleration: 1 },  // seed
  { time: 0.04, position: 0.08, velocity: 2.04, acceleration: 1 },
  // ...many ticks in between...
  { time: 2,   position: 6, velocity: 4, acceleration: 1 },  // last recorded tick — matches simulation
]
```

Note `recordedData`'s last entry always matches `simulation` at the moment recording stops — that's just the last `setSimulation`/`setData` append from the record loop ([one-tick-explained.md](one-tick-explained.md) section 6).

The Velocity `PhysicsInput` shows `value={simulation.velocity}` → `4` ([Controls.jsx:89-96](../src/components/Controls.jsx#L89)). Local state:

```js
text               = "4"
lastValid.current  = 4
```

## 1. You type `10` and press Enter

### 1.1 Keystrokes — same as always, purely local

`onChange` on the `<input>` ([Controls.jsx:38](../src/components/Controls.jsx#L38)) just calls `setText(e.target.value)`, one char at a time:

```js
text = "1"
text = "10"
```

`simulation.velocity` is still `4`. `App` doesn't know yet — identical to the mount case, this part never changes.

### 1.2 Enter → blur → `commit("10")`

Same wiring as before: `onKeyDown` → `blur()` → `onBlur` → `commit("10")` ([Controls.jsx:39-40](../src/components/Controls.jsx#L39)).

### 1.3 `evaluateExpression("10")` ([evaluateExpression.js:1-24](../src/engine/evaluateExpression.js#L1))

```js
trimmed = "10"
/[^0-9+\-*/().\s]/.test("10") → false      // line 11, all digits, passes
result  = new Function('"use strict"; return (10)')()   // line 14
        = 10
isFinite(10) && !isNaN(10) → true          // line 17
return 10                                   // line 18
```

`evaluated = 10`, not `null` — nothing about this step cares whether the sim is paused or fresh; `evaluateExpression` is a pure function with no idea what `App` is doing.

### 1.4 Back in `commit` — the `if` branch fires ([Controls.jsx:19-22](../src/components/Controls.jsx#L19))

```js
setText("10");
lastValid.current = 10;
onChange(10);
```

### 1.5 `onChange(10)` → the Velocity instance's inline arrow ([Controls.jsx:95](../src/components/Controls.jsx#L95))

```js
onChange={(v) => onSimulationChange({ velocity: v })}
// → onSimulationChange({ velocity: 10 })
```

Same as the mount case, up to here every step is identical. The divergence happens next.

### 1.6 `handleSimulationChange({ velocity: 10 })` ([App.jsx:139-147](../src/App.jsx#L139)) — the branch that flips

```js
setSimulation((prev) => ({ ...prev, velocity: 10 }));
// simulation = { position: 6, velocity: 10, acceleration: 1, time: 2 }

if (simulation.time === 0) {   // false — simulation.time is 2, not 0
  setData(...)                 // SKIPPED — this whole block does not run
}
```

`simulation.time` is `2`, not `0`, so the seed-rewrite branch is **skipped entirely**. `recordedData` is not touched:

```js
recordedData = [
  { time: 0,   position: 0, velocity: 2, acceleration: 1 },
  { time: 0.04, position: 0.08, velocity: 2.04, acceleration: 1 },
  // ...
  { time: 2,   position: 6, velocity: 4, acceleration: 1 },   // still says velocity: 4 — untouched!
]
```

This is the whole point of the `time === 0` check ([App.jsx:141](../src/App.jsx#L141)): it only rewrites history while you're still setting up initial conditions before the first tick. Once real ticks exist, editing a parameter only steers the *live* `simulation`, never retroactively edits what was already recorded.

### 1.7 Re-render — the round trip back to `PhysicsInput`

`Controls` re-renders with `simulation.velocity = 10`, so the Velocity `PhysicsInput` gets `value={10}`. Sync effect fires ([Controls.jsx:12-15](../src/components/Controls.jsx#L12)):

```js
setText(String(10));      // "10" — no visible change, already showed "10"
lastValid.current = 10;
```

### 1.8 End state — `simulation` and `recordedData` now disagree, on purpose

```js
simulation              = { position: 6, velocity: 10, acceleration: 1, time: 2 }   // live, moved
recordedData[last]      = { time: 2,     position: 6, velocity: 4,  acceleration: 1 }   // history, frozen
PhysicsInput.text                = "10"
PhysicsInput.lastValid.current   = 10
```

The chart (which reads `data.recordedData`) still draws the old velocity=4 line — your edit doesn't touch it. Only `simulation` (the live snapshot driving the 3D sprite and the input boxes) moved.

## 2. Press Play again — the edit takes effect going forward

If you resume recording, the next tick's physics step reads its starting values straight from `simulation` ([useSimulationLoop.js:88](../src/hooks/useSimulationLoop.js#L88) → [kinematics1d.js:12](../src/engine/kinematics1d.js#L12)), which is now `velocity: 10`. So the next appended `recordedData` entry picks up from `velocity: 10`, not `4` — the trajectory visibly kinks at `time: 2` on the chart. Old points keep their old numbers; every point after the edit uses the new one. Nothing is rewritten, only appended to, same as every tick documented in [one-tick-explained.md](one-tick-explained.md).

## 3. Invalid input — same revert, unaffected by pause

Typing `abc` and blurring behaves identically whether paused or fresh ([Controls.jsx:23-24](../src/components/Controls.jsx#L23)) — `evaluateExpression` rejects it, `commit`'s `else` branch fires, `setText(String(lastValid.current))` snaps the box back to `"10"`, `onChange` never fires, `simulation`/`recordedData` stay exactly as in section 1.8. The `time === 0` branch in `App` never even gets a chance to matter, since nothing reaches `App` at all on a reject. See [velocity-input-explained.md](velocity-input-explained.md) section 2 for the full trace — it's the same mechanism regardless of `time`.

## The pipeline in one line

```
keystroke → local text (uncommitted) → blur/Enter → commit(raw):
  evaluateExpression(raw) → number → setText+lastValid+onChange(value)
                          → null   → setText(lastValid)  [revert, no onChange]

onChange(value) → onSimulationChange({velocity: value}) → App.handleSimulationChange:
  setSimulation merges (always)
  → time === 0 ?  recordedData[0] also merges (mount/setup case)
                :  recordedData untouched — edit only steers the NEXT tick (paused/mid-recording case)
  → re-render → PhysicsInput's value-sync effect confirms text/lastValid
```
