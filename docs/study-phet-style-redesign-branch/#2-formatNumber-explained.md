# Logic #2 Explained: `formatNumber`

File: `src/utils/formatNumber.js:5-7`

## 1. What does `formatNumber` do?

### Quick Note

It turns a raw number into a display-ready string with a fixed number of decimals, and never crashes or shows garbage if the number is bad.

### Answer

```js
export function formatNumber(n, decimals) {
  return Number.isFinite(Number(n)) ? Number(n).toFixed(decimals) : "0";
}
```

- **Inputs:** `n` (the value to display), `decimals` (how many digits after the decimal point).
- **Output:** a string.

**Step by step:**

1. `Number(n)` — coerces the input to a number (handles cases like a numeric string sneaking in).
2. `Number.isFinite(...)` — checks the result is a real, finite number. This is `false` for `NaN`, `Infinity`, `-Infinity`, or anything that doesn't coerce to a usable number.
3. If finite: `.toFixed(decimals)` — rounds and pads to exactly `decimals` digits, e.g. `toFixed(2)` turns `3` into `"3.00"`.
4. If not finite: return the literal string `"0"` instead of letting a broken value reach the screen.

It's a **pure function** — same inputs always give the same output, no side effects — matching the style of `calculatePhysicsStep` from logic #1.

Analogy: it's a display gauge with a built-in "stuck needle" fallback. If the real reading is broken (`NaN`/`Infinity`), the gauge doesn't jitter or show `"NaN m/s"` to the user — it just shows `"0"`.

## 2. Why does the NaN/Infinity fallback matter?

### Quick Note

Physics math can produce `NaN` or `Infinity` in edge cases (like a user clearing an input field mid-typing), and without this guard those values would leak straight onto the screen as literal text.

### Answer

Without the `Number.isFinite` check, `formatNumber` would just do `Number(n).toFixed(decimals)`. If `n` were `NaN` (e.g. from dividing `0/0` somewhere, or a text input momentarily holding an empty string), `.toFixed()` still runs fine — but it returns the string `"NaN"`, which would render as `NaN m/s` in the UI. That's a confusing, broken-looking display for what might just be a brief in-between state (like the user backspacing a number field).

The fallback to `"0"` keeps the UI always showing something sane, even during those transient bad states.

## 3. Why is this worth knowing early, even though it's trivial?

### Quick Note

It's tiny, but it's called constantly — every number shown anywhere in the app goes through it.

### Answer

`formatNumber` has zero dependencies (like `calculatePhysicsStep`), but unlike the physics math, it isn't specific to motion or kinematics at all — it's a cross-cutting **display utility** called from multiple components whenever a number needs to appear on screen:

| Caller | Decimals used | Example |
|---|---|---|
| `App.jsx:156` | 1 | `{formatNumber(simulation.time, 1)} s` |
| `Charts.jsx:191, 228, 265` | 2 | position, velocity, acceleration readouts |
| `Charts.jsx:131` | 2 | chart tooltip coordinates |

Once you know this one function, you instantly understand *every* number displayed anywhere in the app — how it's rounded, and what it falls back to if the underlying state is momentarily invalid. That's a lot of leverage for 3 lines of code, which is why it's worth locking in early before moving on to more involved logic.

### Extra Tips

Per `logic-study-order.md`, `formatNumber` is a **cross-cutting utility** — no arrows point into it in the dependency chain. It doesn't need `calculatePhysicsStep` (logic #1) or anything else to make sense; it just needs to be understood once so it stops being a question mark every time it shows up later in `App.jsx` and `Charts.jsx`.
