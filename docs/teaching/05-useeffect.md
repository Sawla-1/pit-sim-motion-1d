# Lesson 5: useEffect

**Placement note:** useEffect depends on Lessons 1–4. You need to understand components (Lesson 1), state and re-renders (Lesson 2), and refs (Lesson 4) before useEffect makes sense. useEffect is how you run code in response to state changes — without understanding that state causes re-renders (Lesson 2), there is nothing to "react to." The cleanup function pattern also ties into how refs and DOM elements persist (Lesson 4).

---

## 0. Why This Lesson Is Here

You now know that a React component function runs every time state changes, producing a new description of the UI. But some code should NOT run on every render. Starting an interval on every render would create dozens of overlapping intervals. Making a network request on every render would spam the server. React provides `useEffect` as the mechanism for running code in response to specific changes, not on every render.

Understanding useEffect is also necessary before you can understand how the physics loop starts and stops (Lesson 7), and it is the prerequisite for understanding the cleanup pattern that prevents memory leaks.

---

## 1. What Is a Side Effect?

A "side effect" is anything a component does that reaches outside its own rendering — timers, network requests, DOM manipulation, subscriptions, or logging. The render function (the body of your component) should be a pure description of the UI: given these inputs (props and state), produce this output (JSX). Side effects do not belong in the render body because the render body runs many times, unpredictably, and re-running side effects on every render causes problems.

`useEffect` says: "run this function AFTER the screen has updated." React renders the component, updates the DOM, and then calls your effect. This separation keeps the render function pure and gives you a controlled place to put side effects.

---

## 2. The Three Forms of useEffect

**Form 1: No dependency array — runs after EVERY render.**

```js
useEffect(() => {
  document.title = `Count: ${count}`;
});
```

This runs after every render, no matter what changed. Rarely what you want, but valid when you genuinely need to react to any change.

**Form 2: Empty dependency array — runs once, after the first render (mount).**

```js
useEffect(() => {
  const id = setInterval(() => console.log("tick"), 1000);
  return () => clearInterval(id);
}, []);
```

The `[]` says "I have no dependencies." React runs this once after the component appears on screen and never again. This is the pattern for starting a timer, establishing a WebSocket connection, or starting an animation loop.

**Form 3: Specific dependencies — runs after mount AND whenever any listed dependency changes.**

```js
useEffect(() => {
  // Runs when userId changes
  fetchUserData(userId);
}, [userId]);
```

React runs this effect after the first render, and again whenever `userId` changes between renders. This is the pattern for "respond to this specific thing changing."

---

## 3. Cleanup Functions

When an effect sets up something long-lived — a timer, a subscription, an animation loop — it needs to tear it down when the component unmounts or before the effect runs again. You do this by returning a function from the effect. React calls this cleanup function at the right time.

```js
useEffect(() => {
  const id = setInterval(() => {
    setTime(t => t + 1);
  }, 1000);

  return () => {
    clearInterval(id); // Cleanup: stop the interval
  };
}, []);
```

Without the cleanup, every time this component mounts it starts a new interval. If the component unmounts and remounts, you accumulate multiple overlapping intervals. Over time, this is a memory leak and a source of bugs.

The cleanup runs in two situations:
1. Just before the effect runs again (if dependencies changed)
2. When the component unmounts (disappears from the screen)

---

## 4. A Clock Example

Here is a complete clock that shows the current time:

```jsx
function Clock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(id); // Stop the interval when Clock unmounts
  }, []); // Start only once

  return <p>Current time: {time}</p>;
}
```

Step by step:
1. Clock mounts. React runs the effect after the first render.
2. The effect starts a 1-second interval that updates `time` state.
3. Every second, `setTime` triggers a re-render, showing the new time.
4. If Clock unmounts, the cleanup function runs and `clearInterval(id)` stops the ticking.

---

## 5. With It vs. Without It

Here is what happens if you put the setInterval directly in the render body (without useEffect):

```jsx
// WRONG: setInterval in the render body
function BrokenClock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // This runs on EVERY render, starting a new interval each time
  const id = setInterval(() => {
    setTime(new Date().toLocaleTimeString());
  }, 1000);

  return <p>Current time: {time}</p>;
}
```

Every render starts a new interval. The first second triggers a re-render. That re-render starts another interval. Now two intervals are updating the state, causing two re-renders per second. Each of those re-renders starts another interval. Within seconds you have dozens of overlapping intervals, all competing to update state, all causing re-renders, in an exponential cascade. The component becomes unusable.

`useEffect` with `[]` runs once and does not repeat on re-renders. That is the correct behavior.

---

## 6. Common Mistakes

**Missing the dependency array.** Without a dependency array, the effect runs after every render. If the effect updates state, it triggers another render, which runs the effect again — an infinite loop. Always include a dependency array unless you have a specific reason not to.

**Stale closures from an empty dependency array.** This is subtle and it connects directly to Lesson 6. If you use an empty dependency array (`[]`), the effect runs once and captures the values of all variables at that moment. If state changes later, the effect's closure still sees the old values. This is the stale closure problem. It is common enough to deserve its own lesson.

**Forgetting cleanup.** Any effect that sets up something continuous (a timer, a subscription, an event listener) needs to return a cleanup function. Without it, you have a memory leak every time the component mounts.

---

## 7. Practice Exercise

Create a component that takes a `userId` prop and simulates fetching user data when `userId` changes:

```jsx
function UserProfile({ userId }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    let cancelled = false; // Flag to handle the case where userId changes mid-fetch

    setUserData(null); // Clear old data

    // Simulate a network request with a delay
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setUserData({ id: userId, name: `User ${userId}` });
      }
    }, 500);

    return () => {
      cancelled = true; // Prevent stale updates if userId changes before the timeout fires
      clearTimeout(timeoutId);
    };
  }, [userId]); // Re-run whenever userId changes

  if (!userData) return <p>Loading user {userId}...</p>;
  return <p>Loaded: {userData.name}</p>;
}
```

Test this by quickly changing `userId` and verifying that you never see stale data from a previous fetch appear after a newer fetch completes.

---

## 8. In This Project

`Controls.jsx` uses `useEffect` inside its `PhysicsInput` sub-component. Each `PhysicsInput` has local string state (`text`) for the input box and a `lastValid` ref for revert behavior. When the parent (App) changes the simulation — for example when the user clicks Reset — the `value` prop changes. The input's local state needs to update to match:

```js
useEffect(() => {
  setText(String(value));
  lastValid.current = value;
}, [value]);
```

This says: "whenever `value` (the prop) changes, update my local `text` state and my `lastValid` ref to match." Without this, clicking Reset would update App's state and the 3D sprite but leave the input box showing the old number.

`useSimulationLoop.js` uses several `useEffect` calls. One resets the timing refs when the simulation time reaches zero:

```js
useEffect(() => {
  if (time === 0) {
    recordRealTimeStart.current = null;
    recordPauseStartTime.current = null;
  }
}, [time]);
```

Another handles the pause and resume timing — when `playing` changes to `false` in record mode, it stamps the pause start time. When `playing` changes to `true`, it adjusts the start time to exclude the paused duration.

The most important `useEffect` in the whole codebase starts and stops the animation loop. It runs once (with `playing` and the stable setState functions in its deps array), starts a `requestAnimationFrame` loop, and returns a cleanup function that cancels the RAF. This is the topic of Lesson 7.

The lesson to take from this: every time you see a `useEffect` in this project, ask what change is it responding to (the dependency array), what side effect does it set up (the body), and what does it clean up (the return function).
