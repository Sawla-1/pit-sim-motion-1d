# Lesson 4: useRef

**Placement note:** useRef is taught immediately after useState, not before, because the contrast IS the lesson. You need to understand what state IS and why it triggers re-renders before you can appreciate why useRef deliberately does NOT trigger a re-render. Teaching useRef first would mean explaining "a box that stores a value without causing re-renders" before the learner even knows what re-renders are or why they matter. The lesson only lands once you already know useState.

---

## 0. Why This Lesson Is Here

From Lesson 2 you know that `useState` stores a value and triggers a re-render when you change it. That is exactly what you want for things that should update the screen — velocity, position, recorded data. But some values change very frequently and updating them should NOT redraw the UI. Or you need to interact with a DOM element directly. For these cases, React provides `useRef`.

Understanding the distinction between state and refs is critical for understanding why the physics loop in this project works the way it does. Getting this wrong would mean either the UI re-renders 24 times per second for internal bookkeeping values, or the values reset to zero on every render.

---

## 1. The Sticky Note vs. the Whiteboard

Here is an analogy that captures the difference.

State is like a whiteboard in the middle of the room. Every time you erase and rewrite something on it, everyone in the room looks up, notices the change, and reacts. This is exactly what you want when displaying a value on screen.

A ref is like a sticky note attached to the wall in the corner. You can update what is written on it whenever you want, and nobody is watching. No one "reacts." But the note is still there — it persists from one moment to the next. You can walk over and read it at any time.

That is the entire distinction. Use state when a change should update the screen. Use a ref when you need to store a value that persists across renders but whose changes should not cause the UI to update.

---

## 2. Why It Exists

There are two primary use cases for refs:

**Use case A: Storing a mutable value that persists across renders without triggering re-renders.** Examples: a timer ID you need to clear later, a frame counter, an accumulator that tracks leftover time between animation frames, a cached "last valid" value in an input field. These values change frequently and the UI does not care about their current value — you just need them to still exist next time you check.

**Use case B: Accessing a DOM element directly.** Sometimes you need to call a method on an HTML element — `input.focus()`, `canvas.getContext("2d")`, `video.play()`. React does not provide a props-based API for imperative actions like these. A ref gives you the actual DOM element to call methods on.

---

## 3. How to Use useRef

```jsx
import { useRef } from "react";

function StopwatchExample() {
  const intervalIdRef = useRef(null);

  function start() {
    intervalIdRef.current = setInterval(() => {
      console.log("tick");
    }, 1000);
  }

  function stop() {
    clearInterval(intervalIdRef.current);
  }

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
```

`useRef(null)` creates a ref with an initial value of `null`. The ref is an object `{ current: null }`. You read and write the value through `.current`. Assigning `intervalIdRef.current = setInterval(...)` stores the interval ID. Later, `clearInterval(intervalIdRef.current)` uses it.

Notice that updating `.current` directly — no setter function, no ceremony — triggers no re-render. The button labels do not update; the screen does not change. The value is simply stored.

**Use case B — DOM access:**

```jsx
function AutoFocusInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current.focus(); // Call .focus() on the actual DOM element
  }, []);

  return <input ref={inputRef} placeholder="I will focus automatically" />;
}
```

Here, `ref={inputRef}` on the `<input>` element tells React to assign the actual DOM element to `inputRef.current` after it mounts. Then `inputRef.current.focus()` calls the browser's native focus method on the real element.

---

## 4. The Critical Difference Table

| | useState | useRef |
|---|---|---|
| Triggers re-render on change? | YES | NO |
| Survives re-renders? | YES | YES |
| Mutable directly? | NO (use setter) | YES (`.current = ...`) |
| Use for displaying values on screen? | YES | NO |
| Use for internal bookkeeping? | Sometimes | YES |
| Use for DOM element access? | NO | YES |

The key row is the first one. State and refs both survive re-renders. The difference is purely in whether changing the value causes a re-render.

---

## 5. With It vs. Without It

Suppose you need to store an interval ID. What happens if you use state instead of a ref?

```jsx
// WRONG: using state for an interval ID
function BrokenTimer() {
  const [intervalId, setIntervalId] = useState(null);

  function start() {
    const id = setInterval(() => console.log("tick"), 1000);
    setIntervalId(id); // This triggers a re-render!
  }

  // ...
}
```

Every time you call `setIntervalId`, React re-renders the component. This is wasteful for a value that has nothing to do with the UI. Worse, in some cases it can cause loops: the re-render triggers an effect that starts a new interval, which updates state, which triggers another re-render. Using a ref instead is clean and correct:

```jsx
// CORRECT: using a ref for an interval ID
function GoodTimer() {
  const intervalIdRef = useRef(null);

  function start() {
    intervalIdRef.current = setInterval(() => console.log("tick"), 1000);
    // No re-render triggered. The interval ID is just stored silently.
  }

  function stop() {
    clearInterval(intervalIdRef.current);
  }

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
```

---

## 6. Common Mistakes

**Reading `.current` during render to display a value on screen.** If you read `myRef.current` in your JSX (for display), the UI will NOT update when `myRef.current` changes. A ref change does not schedule a re-render. If you want a value displayed on screen, use state.

**Using a ref when you actually DO want the UI to update.** If the user should see a value change on screen, that value needs to be state. A ref whose value you want to display will silently fall out of sync with what the screen shows.

**Forgetting `.current`.** The ref object is `{ current: value }`. The value lives at `.current`. Accidentally writing `myRef = newValue` (without `.current`) replaces the entire ref object, breaking the reference and losing the value.

---

## 7. Practice Exercise

Build a button that, when clicked, moves focus to a text input. Use `useRef` to get the DOM reference to the input:

```jsx
function FocusDemo() {
  const inputRef = useRef(null);

  function focusInput() {
    inputRef.current.focus();
  }

  return (
    <div>
      <input ref={inputRef} placeholder="Click the button to focus me" />
      <button onClick={focusInput}>Focus the input</button>
    </div>
  );
}
```

After getting this working, try storing the number of times the button has been clicked in a ref instead of state. Notice that the display does NOT update when you click. Now switch it to state and notice that it does. This directly demonstrates the difference.

---

## 8. In This Project

`useSimulationLoop.js` uses refs for its internal timing and simulation values. Let us look at each:

```js
const last = useRef(performance.now());
```

`last` stores the timestamp of the previous animation frame. It is used to compute `frameTime = (now - last.current) / 1000` on every frame. It updates 24 or more times per second. Making it state would trigger 24+ re-renders per second just to update an internal counter — which would be both wasteful and incorrect.

```js
const recordRealTimeStart = useRef(null);
const recordPauseStartTime = useRef(null);
```

These track wall-clock timing for the record mode display. `recordRealTimeStart` is the wall-clock time when recording began. `recordPauseStartTime` is the wall-clock time when the user paused. They are used to compute how much real elapsed time has passed so the displayed timer matches real time. They have no business triggering re-renders — they are internal bookkeeping values.

```js
const simulationRef = useRef(simulation);
simulationRef.current = simulation;

const dataRef = useRef(data);
dataRef.current = data;
```

These are the most interesting refs in the project. `simulationRef` and `dataRef` mirror the current values of the `simulation` and `data` state. They are updated every render by assigning directly to `.current` (no setter, no re-render triggered). The animation loop reads from these refs instead of reading `simulation` and `data` directly. The reason for this pattern is subtle and important enough that it gets its own lesson (Lesson 6).

`Controls.jsx` uses a ref inside the `PhysicsInput` sub-component:

```js
const lastValid = useRef(value);
```

This stores the last value that successfully parsed to a number. When the user types something invalid (like `"abc"`) and blurs the input, the input text reverts to `lastValid.current`. This value should not trigger a re-render when it changes — it is internal bookkeeping for the input's revert behavior. State would be wrong here because updating `lastValid` should not cause the component to re-draw.

Whenever you see a value in this codebase that updates very frequently (every frame) or is used only for internal computation (not for display), ask yourself: is this a ref? In almost every case, it is.
