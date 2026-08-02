# Logic #3 Explained: `evaluateExpression`

File: `src/engine/evaluateExpression.js`

## 1. What does `evaluateExpression` do?

### Quick Note

It turns text a user typed (like `1+2`) into a number — or `null` if the text isn't safe/valid math.

### Answer

```js
export function evaluateExpression(expression) {
  try {
    const trimmed = expression.trim();
    if (!trimmed) return null;

    // Reject if any character isn't a number, operator, parenthesis, decimal point, or space
    if (/[^0-9+\-*/().\s]/.test(trimmed)) return null;

    // Use Function constructor for safer evaluation
    const result = new Function('"use strict"; return (' + trimmed + ")")();

    // Validate result is a finite number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}
```

- **Input:** `expression` — a raw string from a text box, e.g. `"1+2"`, `"  "`, `"alert(1)"`.
- **Output:** a `number`, or `null` if anything about the input is invalid.

It's a **pure function** — same input always gives the same output, no side effects — same style as `calculatePhysicsStep` (#1) and `formatNumber` (#2).

## 2. Step 1 — trim and empty check

### Answer

```js
const trimmed = expression.trim();
if (!trimmed) return null;
```

```js
evaluateExpression("   ")   // trimmed === "" → null
evaluateExpression("  3+4 ") // trimmed === "3+4" → continues
```

Strips leading/trailing whitespace, then bails out early if there's nothing left to evaluate.

## 3. Step 2 — regex allowlist (the security gate)

### Quick Note

This is what stops someone from typing JavaScript into a physics input box. It runs **before** anything gets executed.

### Answer

```js
if (/[^0-9+\-*/().\s]/.test(trimmed)) return null;
```

The regex `[^0-9+\-*/().\s]` matches **any character that is NOT** a digit, `+ - * /`, parenthesis, decimal point, or whitespace. If even one such character is found, the whole expression is rejected.

```js
/[^0-9+\-*/().\s]/.test("1+2")       // false — no bad chars → allowed
/[^0-9+\-*/().\s]/.test("alert(1)")  // true  — letters found → rejected

evaluateExpression("alert(1)") // → null, never reaches Function()
```

Because letters are never in the allowlist, arbitrary code (function calls, variable names, `window`, etc.) can never make it past this line.

## 4. Step 3 — evaluate with `Function`

### Answer

```js
const result = new Function('"use strict"; return (' + trimmed + ")")();
```

Builds and immediately calls a new function whose body is `"use strict"; return (<expression>)`.

```js
new Function('"use strict"; return (1+2)')()   // → 3
new Function('"use strict"; return (3+4)')()   // → 7
```

By the time this line runs, the regex already guaranteed `trimmed` only contains math characters — so even though `Function` *could* run arbitrary JS, the only JS it's ever handed is a plain arithmetic expression.

## 5. Step 4 — finite-number validation

### Answer

```js
if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
  return result;
}
return null;
```

```js
evaluateExpression("1/0")  // result = Infinity → fails isFinite → null
evaluateExpression("2*3")  // result = 6 → passes → 6
```

Arithmetic like `1/0` is valid JS and passes the regex, but produces `Infinity`, which is useless as a physics value (e.g. acceleration). This check filters that out.

## 6. Step 5 — `try/catch` catch-all

### Answer

```js
try {
  // ...
} catch {
  return null;
}
```

```js
evaluateExpression("1++")  // malformed syntax → Function() throws → caught → null
```

Anything that still slips through and throws (syntax errors, etc.) is swallowed and turned into `null` instead of crashing the app.

## 7. Full picture

```js
evaluateExpression("1+2")     // 3
evaluateExpression("3 * (4+1)") // 15
evaluateExpression("")        // null — empty
evaluateExpression("   ")     // null — empty after trim
evaluateExpression("alert(1)")// null — blocked by regex
evaluateExpression("1/0")     // null — not finite
evaluateExpression("1++")     // null — throws, caught
```

Every path through the function ends in either a finite number or `null` — nothing else.

## 8. Why this matters for `Controls.jsx`

### Quick Note

`evaluateExpression` never throws and never returns a broken value — so the caller's job is just "check for null."

### Answer

`Controls.jsx` keeps local string state per input so users can type intermediate/incomplete values while typing. On blur/Enter, it calls `evaluateExpression` on that string:

- Valid math → gets a real number, uses it.
- Anything invalid (empty, unsafe chars, `Infinity`, malformed syntax) → gets `null`, and falls back to the last valid value via a `useRef`.

Because every failure mode collapses to the same `null`, `Controls.jsx` never needs to know *why* something failed — one `if (result === null)` check covers all of them.

### Extra Tips

Per `logic-study-order.md`, `evaluateExpression` is **standalone** — no physics knowledge needed, and no dependency on #1 or #2. It's required before `Controls.jsx` specifically because that's the one file that calls it.
