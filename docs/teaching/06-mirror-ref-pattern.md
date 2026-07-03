# Lesson 6: The Mirror Ref Pattern / Stale Closures

**Placement note:** This lesson is placed here, after useState (Lesson 2), useRef (Lesson 4), and useEffect (Lesson 5), because it is a pattern that combines all three. You need to understand: (1) what closures are and why they capture variables, (2) that useRef gives you a mutable box that is not captured by closure in the same way, and (3) that useEffect can run code in response to state changes. Without all three prior lessons, the stale closure problem is impossible to explain clearly and the solution is incomprehensible.

---

## 0. Why This Lesson Is Here

The stale closure problem is the single hardest concept in this codebase. Getting it wrong means the physics loop reads the wrong position, wrong velocity, or wrong mode — and the simulation produces incorrect results in ways that are very hard to debug. Every experienced React developer has been burned by this at least once. This lesson gives you a mental model for what is happening and shows you exactly how this project handles it.

---

## 1. What Is a Stale Closure?

A closure is a function that "remembers" the variables from the scope where it was created, even after that scope has ended. Every JavaScript function is a closure. When you write:

```js
function makeAdder(x) {
  return function(y) {
    return x + y; // x is captured from the outer scope
  };
}

const addFive = makeAdder(5);
addFive(3); // Returns 8 — it still remembers x = 5
```

The inner function captures `x` at the time it is created. This is the power of closures. But it is also the source of bugs.

A "stale closure" happens when a function captures a variable at creation time, and then that variable changes later, but the function is still using the original captured value — the "stale" one. It is like a photograph: it shows the room as it was when the photo was taken, not as it is right now.

---

## 2. Why This Matters for Animation Loops

When you start a `setInterval` or a `requestAnimationFrame` loop inside a React component, the callback function is created once and runs repeatedly. If the callback reads React state, it reads the value of that state at the time the callback was created — not the current value.

Here is the canonical broken example:

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // ALWAYS logs 0 — stale closure
      setCount(count + 1); // ALWAYS sets to 1 — count is always 0 here
    }, 1000);
    return () => clearInterval(id);
  }, []); // Empty deps: runs once, captures count=0 forever

  return <p>Count: {count}</p>;
}
```

The effect runs once (empty dependency array). At that moment, `count` is `0`. The interval callback captures `count = 0`. Every second, the callback fires, logs `0`, and calls `setCount(0 + 1)`. React sets count to `1`, triggers a re-render, the screen shows `Count: 1`. But the interval callback still has `count = 0` captured. So next second it sets count to `0 + 1 = 1` again. Count is stuck at `1` forever.

---

## 3. Fix #1: Functional Updates

For the specific case of updating state based on its current value, you can use the functional form of the setter. Instead of `setCount(count + 1)`, write `setCount(prev => prev + 1)`. React passes the guaranteed-current value as the argument:

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1); // Always uses the latest value
  }, 1000);
  return () => clearInterval(id);
}, []);
```

This works for incrementing, but it does not help when you need to READ state inside the callback — for example, to check what mode the simulation is in before deciding what to do.

---

## 4. Fix #2: The useEffect Dependency Array

The second fix is to add the state variable to the dependency array. React will re-run the effect whenever the value changes, creating a new closure that captures the current value:

```jsx
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // Always fresh — effect re-runs when count changes
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]); // Re-run when count changes
```

Now every time `count` changes, React cleans up the old interval (via the return function) and starts a new one with the new closure that has the updated `count`. The downside: the interval restarts every second, which may cause a small timing hiccup. For a simple counter this is fine.

In this project, the `playing` state is handled this way. The RAF loop `useEffect` lists `playing` in its dependency array:

```js
useEffect(() => {
  let raf;
  let accumulator = 0;
  // ...
  function loop(now) {
    // ...
    if (playing) { /* ... */ }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}, [playing, setSimulation, setData, setPlaying]);
```

When `playing` changes (user hits Play or Pause), the old loop is cancelled and a new loop starts, with a fresh closure that captures the new `playing` value. This is clean for a boolean that only changes on user action — the brief restart of the loop is imperceptible.

---

## 5. Fix #3: The Mirror Ref Pattern

But what about `simulation` and `data`? These change 24 times per second during recording. If you added them to the dependency array, the RAF loop would cancel and restart 24 times per second, resetting the accumulator and causing jitter. That is the wrong fix.

The mirror ref pattern solves this. Instead of reading `simulation` directly in the closure (where it would be stale), you create a ref that always holds the current value:

```js
const simulationRef = useRef(simulation);
simulationRef.current = simulation;

const dataRef = useRef(data);
dataRef.current = data;
```

These two lines run on every render. `simulationRef.current` is assigned the current `simulation` value during the render phase. By the time any RAF callback fires, `simulationRef.current` holds the latest value.

Inside the loop, instead of reading `simulation` (stale) or `data` (stale), you read from the refs:

```js
function loop(now) {
  // ...
  const sim = simulationRef.current; // Always fresh
  const dat = dataRef.current;       // Always fresh
  // ...
}
```

Why does this work? The ref object itself IS captured by the closure — the loop always has a reference to the same `simulationRef` object. But `.current` is a property of that object, and properties can be updated after the closure is created. The render phase updates `.current` before the RAF callback reads it. The closure always reads the latest `.current`, not a snapshot.

Think of it this way: the closure captures the address of a mailbox. The contents of the mailbox can change. The closure always reads whatever is currently in the mailbox, not what was in it when the address was written down.

---

## 6. This Project's Approach in Summary

This project uses TWO different solutions to the stale closure problem, applied to different values:

| Value | Approach | Why |
|---|---|---|
| `playing` | useEffect dependency array — loop restarts when playing changes | `playing` rarely changes (only on user action). Restarting the loop is fine. |
| `simulation` | Mirror ref — `simulationRef.current = simulation` on every render | `simulation` changes 24 times/second. Restarting the loop that often would break things. |
| `data` | Mirror ref — `dataRef.current = data` on every render | Same reason as `simulation`. |

---

## 7. With It vs. Without It

Without mirror refs, the simulation loop reads stale state. Suppose the user sets velocity to 5 m/s and hits play:

- Loop closure captures `simulation = { velocity: 0 }` (the value at loop creation)
- Loop calls `calculatePhysicsStep` with `velocity: 0`
- Ball never moves — the loop always computes from the initial state

With mirror refs, every render updates `simulationRef.current` to the latest simulation values. The loop reads from the ref and always gets the correct velocity, position, and acceleration.

---

## 8. Common Mistakes

**Forgetting to update the ref.** The pattern only works if you assign `ref.current = value` on every render. If you initialize the ref but never update it, it goes stale just like a regular closure.

**Using a ref when functional updates would suffice.** If you only need to SET state based on its current value, `setState(prev => ...)` is simpler and cleaner than a mirror ref. Only reach for mirror refs when you need to READ the current value inside a long-lived callback.

**Confusing the ref pattern with the useEffect-sync pattern.** Some tutorials show `useEffect(() => { ref.current = value; }, [value])` to sync a ref via effect. This project uses a simpler direct assignment: `ref.current = value` at the top of the render, outside any hook. Both work; the direct assignment is slightly simpler and updates the ref synchronously before any callbacks can fire.

---

## 9. Practice Exercise

Fix the broken counter:

```jsx
// BROKEN — stuck at 1
function BrokenCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // count is always 0 here
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <p>Count: {count}</p>;
}
```

First, fix it using a functional update: change `setCount(count + 1)` to `setCount(prev => prev + 1)`.

Then, fix it using the mirror ref pattern:

```jsx
function FixedCounter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  countRef.current = count; // Update on every render

  useEffect(() => {
    const id = setInterval(() => {
      setCount(countRef.current + 1); // Always reads the latest count
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <p>Count: {count}</p>;
}
```

When should you use each? Functional updates work when you only need to compute the next value from the current one. Mirror refs are necessary when you need to READ the current value for a reason other than computing the next value — for example, checking whether a condition is met, or using the current value as an input to a calculation that also depends on other refs.

---

## 10. In This Project

Open `src/hooks/useSimulationLoop.js`. Near the top of the hook, you will see:

```js
const simulationRef = useRef(simulation);
simulationRef.current = simulation;
const dataRef = useRef(data);
dataRef.current = data;
```

These two pairs of lines run on every render of `App` (because `useSimulationLoop` is called inside `App`). Every time `setSimulation` or `setData` causes a re-render, `simulationRef.current` and `dataRef.current` are updated to the latest values before the next RAF callback fires.

Inside the RAF loop, the callback reads:

```js
const sim = simulationRef.current;
const dat = dataRef.current;
```

These local variables `sim` and `dat` hold whatever the state was at the most recent render. If `playing` is `true` and the loop is active, `sim` reflects the last-known physics state and `dat` reflects the last-known recording/playback state. The physics calculation and the mode dispatch (record vs. playback) both use these fresh values.

Without this pattern, the simulation would freeze or behave incorrectly as soon as the physics state changed from its initial value. This is the most important pattern in the whole codebase. Read it carefully in the source, trace the flow, and make sure you understand every line before moving on to Lesson 7.
