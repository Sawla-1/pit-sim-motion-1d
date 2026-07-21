# Typing into Velocity: `1+1` → `2`, and the `abc` revert

Setup: fresh mount, nobody has pressed Play yet. You click the Velocity text box and type `1+1`, then press Enter. Second section: same starting point, but you type `abc` and blur instead. Real state values throughout.

## 0. State at mount, before you touch anything

Three states are born ([App.jsx:19-33](../src/App.jsx#L19)):

```js
simulation = { position: 0, velocity: 0, acceleration: 0, time: 0 }
data.recordedData = [{ time: 0, position: 0, velocity: 0, acceleration: 0 }]  // seed frame [0]
```

`Controls` renders the Velocity `PhysicsInput` with `value={simulation.velocity}` → `0` ([Controls.jsx:89-96](../src/components/Controls.jsx#L89)). Inside `PhysicsInput`, local state is born from that prop ([Controls.jsx:9-10](../src/components/Controls.jsx#L9)):

```js
text            = "0"   // what's actually drawn in the box
lastValid.current = 0   // fallback if you type garbage
```

## 1. Case A — you type `1+1` and press Enter

### 1.1 Keystrokes — uncommitted, local only

Every keystroke fires `onChange` on the `<input>` ([Controls.jsx:38](../src/components/Controls.jsx#L38)), which is just `setText(e.target.value)` — nothing outside `PhysicsInput` knows yet:

```js
text = "1"     // after typing '1'
text = "1+"    // after typing '+'
text = "1+1"   // after typing the second '1'
```

`simulation.velocity` is still `0` the whole time. `App` has not been told anything.

### 1.2 Enter → blur → `commit("1+1")`

`onKeyDown` sees `Enter` and calls `e.target.blur()` ([Controls.jsx:40](../src/components/Controls.jsx#L40)), which fires `onBlur` → `commit(e.target.value)` ([Controls.jsx:39](../src/components/Controls.jsx#L39)) with `raw = "1+1"`.

`commit` ([Controls.jsx:17-26](../src/components/Controls.jsx#L17)) calls the engine function first:

```js
const evaluated = evaluateExpression("1+1");
```

### 1.3 Inside `evaluateExpression("1+1")` ([evaluateExpression.js:1-24](../src/engine/evaluateExpression.js#L1))

```js
trimmed = "1+1"                                  // line 7, already clean
/[^0-9+\-*/().\s]/.test("1+1") → false           // line 11 — no disallowed chars present, check passes
result  = new Function('"use strict"; return (1+1)')()   // line 14
        = 2
typeof result === "number" && !isNaN(2) && isFinite(2)   // line 17 — all true
return 2                                          // line 18
```

(Note: this used to *strip* disallowed characters with `.replace()` and evaluate whatever survived — since fixed to *reject* the whole input if any disallowed character is present, e.g. `"2=2"` now correctly returns `null` instead of silently becoming `22`.)

`evaluated = 2`, not `null`.

### 1.4 Back in `commit` — the `if` branch fires ([Controls.jsx:19-22](../src/components/Controls.jsx#L19))

```js
setText("2");            // box now shows "2"
lastValid.current = 2;   // new fallback
onChange(2);              // calls the PhysicsInput's onChange prop
```

### 1.5 `onChange(2)` is the Velocity instance's inline arrow ([Controls.jsx:95](../src/components/Controls.jsx#L95))

```js
onChange={(v) => onSimulationChange({ velocity: v })}
// → onSimulationChange({ velocity: 2 })
```

`onSimulationChange` is `Controls`'s prop, wired from `App` as `handleSimulationChange` ([App.jsx:181](../src/App.jsx#L181)).

### 1.6 `handleSimulationChange({ velocity: 2 })` ([App.jsx:139-147](../src/App.jsx#L139))

```js
setSimulation((prev) => ({ ...prev, velocity: 2 }));
// simulation = { position: 0, velocity: 2, acceleration: 0, time: 0 }

if (simulation.time === 0) {   // true — sim hasn't started ticking
  setData((prev) => ({
    ...prev,
    recordedData: [{ ...prev.recordedData[0], velocity: 2 }],
  }));
}
// recordedData = [{ time: 0, position: 0, velocity: 2, acceleration: 0 }]
```

Both `simulation` **and** the seed frame `recordedData[0]` move together — this is the same seed-rewrite behavior documented in [one-tick-explained.md](one-tick-explained.md) section 2. It only happens because `simulation.time` is still `0`; if you were mid-recording or in playback, only `simulation` would update and `recordedData[0]` would be left alone.

### 1.7 Re-render — the round trip back to `PhysicsInput`

React re-renders `Controls` with the new `simulation.velocity = 2`, so the Velocity `PhysicsInput` receives `value={2}`. Its sync effect fires ([Controls.jsx:12-15](../src/components/Controls.jsx#L12)):

```js
setText(String(2));      // "2" — already "2", no visible change
lastValid.current = 2;   // re-confirmed
```

This effect is what closes the loop: the box doesn't just trust its own `commit()` — it re-syncs from whatever `App` actually ended up storing, so if `App` ever clamped or transformed the value, the box would reflect *that*, not the raw commit.

### 1.8 End state after Case A

```js
simulation         = { position: 0, velocity: 2, acceleration: 0, time: 0 }
recordedData[0]     = { time: 0,     position: 0, velocity: 2, acceleration: 0 }
PhysicsInput.text          = "2"
PhysicsInput.lastValid.current = 2
```

## 2. Case B — you type `abc` and blur (the revert path)

Starting fresh from the same mount state as section 0 (`velocity = 0`, box shows `"0"`).

### 2.1 Keystrokes

Same as before, purely local ([Controls.jsx:38](../src/components/Controls.jsx#L38)):

```js
text = "a"
text = "ab"
text = "abc"
```

### 2.2 Blur → `commit("abc")`

You click elsewhere; `onBlur` fires `commit("abc")` ([Controls.jsx:39](../src/components/Controls.jsx#L39)).

### 2.3 Inside `evaluateExpression("abc")` ([evaluateExpression.js:1-24](../src/engine/evaluateExpression.js#L1))

```js
trimmed = "abc"                                  // line 7
/[^0-9+\-*/().\s]/.test("abc") → true            // line 11 — every char is a letter, none allowed → reject
return null                                       // line 11 fires immediately
```

The `Function` constructor on line 14 is **never reached**. `evaluated = null`.

### 2.4 Back in `commit` — the `else` branch fires ([Controls.jsx:23-24](../src/components/Controls.jsx#L23))

```js
setText(String(lastValid.current));   // lastValid.current is still 0 → setText("0")
```

`onChange` is **never called**. Nothing propagates to `onSimulationChange`, nothing propagates to `App`.

### 2.5 End state after Case B

```js
simulation         = { position: 0, velocity: 0, acceleration: 0, time: 0 }   // untouched
recordedData[0]     = { time: 0,     position: 0, velocity: 0, acceleration: 0 }   // untouched
PhysicsInput.text          = "0"    // reverted, visibly snaps back from "abc"
PhysicsInput.lastValid.current = 0   // unchanged
```

The box visibly snaps from `"abc"` back to `"0"` on blur — that's the only observable effect. `App` never finds out you typed anything invalid.

## The pipeline in one line

```
keystroke → local text (uncommitted) → blur/Enter → commit(raw):
  evaluateExpression(raw) → number → setText+lastValid+onChange(value)
                          → null   → setText(lastValid)  [revert, no onChange]

onChange(value) → onSimulationChange({velocity: value}) → App.handleSimulationChange:
  setSimulation merges → (time===0 ? recordedData[0] also merges : untouched) → re-render
  → PhysicsInput's value-sync effect confirms text/lastValid against the real stored value
```
