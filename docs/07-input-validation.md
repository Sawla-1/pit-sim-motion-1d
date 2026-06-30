# Input Validation

## The problem

Physics parameter inputs need to accept intermediate states while the user is typing: `-` before a negative number, `1+` before finishing an expression, or `0.` before a decimal. Committing on every keystroke would cause jumpy behavior or reject valid in-progress input.

## Solution: local string state + commit-on-blur

Each parameter (position, velocity, acceleration) has:
- A local `useState` string that updates on every keystroke — this is what the `<input>` renders
- A `useRef` holding the last valid numeric value — used to revert on bad input
- A blur/Enter handler that evaluates and commits

```js
const [positionInput, setPositionInput] = useState(String(simulation.position));
const lastValidPosition = useRef(simulation.position);
```

## Expression evaluation

`evaluateExpression` in `Controls.jsx` allows simple arithmetic in input fields (e.g. typing `5/2` gives `2.5`):

```js
function evaluateExpression(expression) {
  const cleaned = trimmed.replace(/[^0-9+\-*/().\s]/g, "");
  const result = new Function('"use strict"; return (' + cleaned + ")")();
  if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
    return result;
  }
  return null;
}
```

The regex strips any character that is not a digit, arithmetic operator, parenthesis, decimal point, or space before passing to `Function`. This limits (but does not eliminate) the eval surface — identifiers and string literals are stripped but more exotic payloads may survive. Acceptable risk for a local educational tool, not for production web deployment.

## Commit on blur or Enter

```js
const handlePositionBlur = (e) => {
  const evaluated = evaluateExpression(e.target.value.trim());
  if (evaluated !== null) {
    setPositionInput(String(evaluated));
    lastValidPosition.current = evaluated;
    onSimulationChange({ position: evaluated });
  } else {
    setPositionInput(String(lastValidPosition.current));  // revert
  }
};

const handlePositionKeyDown = (e) => {
  if (e.key === "Enter") e.target.blur();  // trigger blur → commit
};
```

## External sync

When `simulation.position` changes from outside Controls (e.g. reset, playback tick), a `useEffect` syncs the local string state:

```js
useEffect(() => {
  setPositionInput(String(simulation.position));
  lastValidPosition.current = simulation.position;
}, [simulation.position]);
```

This keeps the text input display in sync when the simulation is running or when the user resets, without the input field fighting the user while they are typing.

## Range slider

Each parameter also has a `<input type="range">` slider. Sliders commit immediately on change (no intermediate state needed — they always produce valid numbers):

```jsx
<input
  type="range"
  value={simulation.position}
  onChange={(e) => onSimulationChange({ position: Number(e.target.value) || 0 })}
/>
```

Moving the slider updates `simulation` directly in `App`, which then flows back into the text input via the `useEffect` sync above.
