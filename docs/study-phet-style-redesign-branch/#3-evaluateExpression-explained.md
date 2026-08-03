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

## 4. Deep dive — decoding the regex itself

### Quick Note

The line above just says "reject bad characters," but the regex syntax packs a few separate JS concepts together. Worth unpacking each piece.

### Answer

**`.test()`** is a built-in method on every RegExp — plain core JS, not a browser-only API. Same behavior in Node, browsers, anywhere JS runs. It returns `true`/`false` for "does this string match anywhere."

```js
/\d/.test("abc123") // true — found a digit
```

**`\s`** is the whitespace character class — matches space, tab, newline, etc. It's a sibling of `\d` (any digit) and `\w` (any word character: letter/digit/underscore).

**`[...]`** is a *character class* — "match any one character that is one of these." `[abc]` matches `a`, `b`, or `c` (one char, any of the three).

```js
/[abc]/.test("cat") // true — "c" is in the set
```

**`^`** as the *first* character inside `[...]` flips the meaning to negation: `[^abc]` means "match any char that is **not** `a`, `b`, or `c`." Conceptually it's like `!` for booleans, but it only works this way inside a character class — a `^` anywhere else in a regex means something different (start-of-string anchor).

```js
/[^abc]/.test("abd") // true — "d" is not a/b/c
```

Putting it together, the project's regex:

```js
/[^0-9+\-*/().\s]/
```

reads as: "any character that is **not** a digit (`0-9`), `+`, `-`, `*`, `/`, `(`, `)`, `.`, or whitespace (`\s`)." Since `.test()` returns `true` on a match, this line is really asking "is there a *disallowed* character anywhere in the string?" — and `if (...)` rejects the input when the answer is yes.

```js
const bad = /[^0-9+\-*/().\s]/;

bad.test("2 + 3 * (4-1)") // false — every char is allowed
bad.test("2 + a")         // true  — "a" isn't in the allowlist → rejected
```

**One more detail:** `0-9` inside `[...]` is a *range*, not two separate characters — it means "any digit from 0 through 9." The same range syntax works for letters: `a-z` (lowercase) or `A-Z` (uppercase). That's how a regex could allow/reject whole alphabets without listing every letter.

## 5. Deep dive — `NaN` and why `isNaN(result)` (line 17) is still needed

### Quick Note

The empty check (line 8) and the regex allowlist (line 11) both run *before* anything is evaluated. Neither one can see what the assembled expression actually computes to — that's the gap `isNaN(result)` on line 17 closes.

### Answer

**What `NaN` is.** `NaN` means "**N**ot **a** **N**umber" — a special JS value that represents an invalid or undefined math result (like `0/0`, or `"abc" * 2`). It's still typed as a `number`, which trips people up:

```js
typeof NaN   // "number" — NaN's type is "number", not something else
NaN === NaN  // false    — NaN never equals anything, not even itself
```

Because `NaN === NaN` is `false`, you can't check for it with `result === NaN`. That's exactly why `isNaN(result)` exists — it's the only reliable way to ask "is this NaN?"

**Why the regex (line 11) doesn't already cover this.** The regex only inspects *characters* — it asks "is every character in this string a digit, operator, paren, dot, or space?" It has no idea what the characters mean once assembled into an expression. `"0/0"` is made entirely of allowed characters, so it sails straight through the regex — the regex's job is done, and it was never designed to catch this.

```js
/[^0-9+\-*/().\s]/.test("0/0")  // false — no disallowed chars → passes regex
```

**What happens at line 14.** `new Function(...)` (line 14) actually runs the expression inside the `try/catch`. That produces two different kinds of "bad" results, and only one of them throws:

```js
evaluateExpression("5+")   // "5+" is all allowed chars, but incomplete syntax
                            // → Function() throws SyntaxError → caught by try/catch → null

evaluateExpression("()")   // also all allowed chars, also invalid syntax
                            // → throws → caught → null

evaluateExpression("0/0")  // all allowed chars, and it's *valid* syntax
                            // → Function() runs fine, no throw
                            // → result is NaN
                            // → try/catch never fires — isNaN(result) is the only thing that catches this
```

So `"0/0"` is the case that slips past both earlier guards *and* the `try/catch`: nothing about it is malformed, so nothing throws. Line 17's `isNaN(result)` is the only check left standing between that and returning `NaN` to the caller.

**Which check catches what:**

| Check | Line | Catches |
|---|---|---|
| Regex allowlist | 11 | **Disallowed characters** — letters, semicolons, brackets, anything not math (`"alert(1)"`) |
| `try/catch` | 21 | **Malformed syntax** made of allowed characters — incomplete expressions (`"5+"`, `"()"`) |
| `isNaN(result)` | 17 | **Allowed characters + valid syntax, but an invalid numeric result** (`"0/0"`) |

Three checks, three different failure shapes — none of them redundant.

**Bonus: `isFinite(result)` catches a fourth shape.** `isNaN` alone still wouldn't be enough, because not every "bad" division result is `NaN`:

```js
evaluateExpression("5/0")  // valid syntax, runs fine, result = Infinity
                            // Infinity is NOT NaN, so isNaN(Infinity) is false
                            // → isFinite(result) is what rejects it → null
```

`0/0` → `NaN`. `5/0` → `Infinity`. Two different invalid results, which is why line 17 checks both `!isNaN(result)` and `isFinite(result)`, not just one.

## 6. Deep dive — why `try/catch` is needed (and why the other checks never throw)

### Quick Note

Section 5's table already showed *what* each check catches. This is about *why* `try/catch` behaves so differently from the other two — and it comes down to one line.

### Answer

**The core distinction:** functions that just *inspect* a value (`.test()`, `isNaN()`, `isFinite()`) always have a boolean answer to give, even for garbage input — they never throw. Functions that *parse/compile/execute* text as code (`new Function(...)`, `eval`, `JSON.parse`) throw when the input doesn't parse as valid syntax, because there's nothing sensible to return instead.

```js
/[^0-9]/.test("abc")      // -> true, no crash
new Function("5+")()      // -> throws SyntaxError, "5+" isn't valid JS
```

`.test("abc")` can always answer "does this match?" — even nonsense input has a true/false answer. But `new Function("5+")` has to actually build and run JS from the string `"5+"`, and `"5+"` isn't a complete program — there's no number to hand back, so it throws instead of returning something meaningless.

**The logical conclusion:** `try/catch` in this file exists **only** because of line 14 (`new Function(...)()`). If line 14 were removed — leaving only checks like `.test`/`isNaN`/`isFinite` — the `try/catch` would become unnecessary. And if it were kept anyway, the `catch` block would be dead code that never fires, since nothing left inside `try` could ever throw:

```js
function neverThrows(str) {
  try {
    if (!/^[0-9+\-*/.() ]*$/.test(str)) return null; // never throws
    const n = Number(str);
    if (isNaN(n)) return null;      // never throws
    return n;
  } catch (e) {
    console.log("caught!", e); // <-- NEVER runs
  }
}
```

So `try/catch` isn't guarding the regex or the `isNaN`/`isFinite` checks — those are already crash-proof on their own. It exists purely to guard the one line that runs untrusted text as code.

## 7. Step 3 — evaluate with `Function`

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

## 8. Step 4 — finite-number validation

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

## 9. Step 5 — `try/catch` catch-all

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

## 10. Full picture

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

## 11. Why this matters for `Controls.jsx`

### Quick Note

`evaluateExpression` never throws and never returns a broken value — so the caller's job is just "check for null."

### Answer

`Controls.jsx` keeps local string state per input so users can type intermediate/incomplete values while typing. On blur/Enter, it calls `evaluateExpression` on that string:

- Valid math → gets a real number, uses it.
- Anything invalid (empty, unsafe chars, `Infinity`, malformed syntax) → gets `null`, and falls back to the last valid value via a `useRef`.

Because every failure mode collapses to the same `null`, `Controls.jsx` never needs to know *why* something failed — one `if (result === null)` check covers all of them.

### Extra Tips

Per `logic-study-order.md`, `evaluateExpression` is **standalone** — no physics knowledge needed, and no dependency on #1 or #2. It's required before `Controls.jsx` specifically because that's the one file that calls it.
