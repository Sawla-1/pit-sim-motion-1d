# Lesson 2: useState

**Placement note:** You need Lesson 1 first because useState only makes sense once you understand what a component IS and what "re-render" means — React re-runs your component function whenever state changes, and that re-run updates the screen. Without understanding components and rendering from Lesson 1, the concept of "state triggers a re-render" has no foundation.

---

## 0. Why This Lesson Is Here

In Lesson 1 you learned that a React component is a function that returns a description of the UI. But that raises a question: how does a component remember anything between calls? If React calls your component function every time the UI needs to update, every local variable inside the function starts fresh on each call. How do you store a count, a velocity, or a list of recorded positions?

The answer is `useState`. It is React's mechanism for giving a component persistent memory. Understanding it is non-negotiable — the rest of the curriculum depends on knowing why state triggers re-renders and why you cannot just use a plain variable.

---

## 1. State Is a Component's Memory

Think of a component as a function that React calls repeatedly. Each time React calls it, the component produces a description of what the UI should look like RIGHT NOW. Local variables inside the function — `let x = 0` — reset to their initial values on every call. They have no memory.

State is different. State is stored by React on behalf of the component and survives across calls. When React re-runs your component function, it gives you back the last value you stored in state. Changing state causes React to call your function again with the new value, producing an updated description, which React then applies to the screen.

A counter is the canonical example. You want a number that starts at 0, increases each time a button is clicked, and displays on screen.

---

## 2. Why useState Exists — The Broken Version First

Here is the broken attempt without useState:

```jsx
function Counter() {
  let count = 0; // BROKEN: resets to 0 on every render

  return (
    <button onClick={() => { count++; console.log(count); }}>
      Count: {count}
    </button>
  );
}
```

This does not work for two reasons. First, clicking the button increments the local variable and logs it, but that change never triggers React to re-run the component. The screen never updates. Second, even if React did re-run the component, `count` would reset to 0 on every run anyway.

Plain variables cannot do the job. You need something that both survives re-renders AND tells React when to re-render.

---

## 3. The Fix: useState

```jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0); // Start at 0

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

`useState(0)` does two things: it creates a piece of state with initial value `0`, and it returns an array with exactly two items. By convention, you destructure that array immediately: `const [count, setCount] = useState(0)`. `count` is the current value; `setCount` is the function you call to change it.

When you call `setCount(count + 1)`, React schedules a re-render. On the next render, `useState(0)` returns the NEW value (`1`) instead of the initial value (`0`). React re-runs your component function, it returns the button showing `Count: 1`, and React updates the screen.

The naming convention is `[value, setValue]` — always a noun for the value and a `set` prefix for the updater function.

---

## 4. With It vs. Without It

Without useState, clicking produces no visible result:

```jsx
// WRONG — nothing updates on screen
function Counter() {
  let count = 0;
  return <button onClick={() => count++}>Count: {count}</button>;
}
```

With useState, the screen updates every time you click:

```jsx
// CORRECT
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

The fundamental reason this works is that `setCount` tells React "something changed, re-run this component." A plain variable increment tells React nothing.

---

## 5. The Update Is Asynchronous

This is one of the most common sources of confusion. When you call `setCount(count + 1)`, the value of `count` does NOT immediately change. The update happens on the NEXT render. This means reading `count` immediately after calling `setCount` gives you the OLD value:

```jsx
function handleClick() {
  setCount(count + 1);
  console.log(count); // STILL LOGS THE OLD VALUE
}
```

This is not a bug — it is how React batches and schedules updates for performance. The new value is only available on the next render.

When you need to compute a new value based on the current value and you are not sure if the state is fresh, use the functional form of the updater:

```jsx
setCount(prev => prev + 1); // Always uses the latest value
```

The function receives the guaranteed-current value as its argument. This is safer in loops or when multiple updates happen in quick succession.

---

## 6. Object State

State can hold any JavaScript value: a number, a string, a boolean, an array, or an object. When state is an object and you want to update only one field, you must spread the old state and override the field you changed. If you do not spread, you replace the entire state object and lose the fields you did not update:

```jsx
const [sim, setSim] = useState({ position: 0, velocity: 0, acceleration: 0 });

// WRONG: loses velocity and acceleration
setSim({ position: 5 });

// CORRECT: preserves all other fields
setSim(prev => ({ ...prev, position: 5 }));
```

The `...prev` syntax (called the spread operator) copies all existing key-value pairs from `prev` into the new object, then the `position: 5` overrides just that one field.

Never mutate the state object directly:

```jsx
// WRONG: React does not know you changed it
sim.position = 5;

// CORRECT: always create a new object
setSim(prev => ({ ...prev, position: 5 }));
```

React detects changes by comparing the reference. If you mutate the existing object, the reference stays the same and React does not schedule a re-render.

---

## 7. Common Mistakes

**Mutating state directly.** `state.position = 5` changes the value but React does not notice. Always use the setter function and produce a new object.

**Calling the setter in a loop without functional updates.** If you call `setCount(count + 1)` three times in one event handler, React batches the updates and the second and third calls all see the same old `count`. Use `setCount(prev => prev + 1)` so each update builds on the previous.

**Reading state immediately after setting it.** The new value is only available on the next render. This catches nearly every beginner at least once.

---

## 8. Practice Exercise

Extend the counter from above to include a "Reset" button that sets the count back to 0:

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Add 1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

Now modify it so the counter also tracks and displays the highest value it has ever reached. You will need a second piece of state. On each increment, check if the new count exceeds the recorded maximum and update accordingly.

---

## 9. In This Project

`App.jsx` has exactly three `useState` calls:

```js
const [simulation, setSimulation] = useState({
  position: 0,
  velocity: 0,
  acceleration: 0,
  time: 0,
});

const [playing, setPlaying] = useState(false);

const [data, setData] = useState({
  recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }],
  selectedMode: "record",
  playbackTime: 0,
});
```

`simulation` is the current physics snapshot. It holds the four values that describe the object's state right now: where it is, how fast it is going, how fast that speed is changing, and what time it is. Any time the physics loop advances one step, it calls `setSimulation` with new values, which triggers a re-render and updates the 3D sprite and the current value readouts on the charts.

`playing` is a simple boolean. It is `true` when the simulation is running and `false` when it is paused. It is kept separate from `simulation` deliberately so the physics engine never has to look at it (the physics engine should not know anything about whether the UI is currently playing or paused — that is a UI concern).

`data` holds the recording and playback state. `recordedData` is the growing array of physics snapshots — every time the physics loop runs one step in record mode, it appends a new entry. `selectedMode` is either `"record"` or `"playback"`. `playbackTime` is the scrub position in playback mode.

All three of these need to be state (rather than plain variables or refs) because changing them must trigger a re-render. When `simulation` changes, the 3D sprite must move. When `data.recordedData` grows, the charts must update. When `playing` changes, the play/pause button must show the right icon.
