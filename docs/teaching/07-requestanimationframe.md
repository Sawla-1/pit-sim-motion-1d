# Lesson 7: requestAnimationFrame and Animation Loops

**Placement note:** This lesson comes after Lessons 1–6 because an animation loop is useless without understanding: (1) what a React component is, (2) that RAF callbacks are long-lived functions that suffer stale closure (Lesson 6 — the mirror ref pattern is the prerequisite), and (3) useEffect for starting and stopping the loop (Lesson 5). If you taught RAF before the mirror ref pattern, the learner would write a loop that reads stale state and not know why it is broken.

---

## 0. Why This Lesson Is Here

The physics loop in this project runs via `requestAnimationFrame`. Understanding RAF is essential for understanding why the loop works, why it is smooth, and why it is started and stopped the way it is. After Lesson 6 you now understand stale closures — you are ready to see how a real animation loop is built and how this project uses it.

---

## 1. What Is requestAnimationFrame?

Every time your browser is about to repaint the screen — typically 60 times per second on a modern monitor — it gives you the opportunity to run some code first. This is what `requestAnimationFrame` (RAF) is for. You register a callback, and the browser calls it right before the next frame is painted.

Think of it as knocking on a door: you tell the browser "knock on my door before you draw the next frame." The browser knocks, you do your work (update positions, recalculate physics), and then the browser paints the result. This keeps your animation synchronized with the actual screen updates.

This is in contrast to `setInterval`, which fires on a timer regardless of what the browser is doing. `setInterval(fn, 16)` fires every 16 milliseconds — but if the browser is not ready to paint, your update runs for nothing. If the browser is in the middle of a paint, you might get tearing. RAF is the correct tool for any kind of animation.

---

## 2. How RAF Works — It Is NOT a Loop

This is the most important conceptual point about RAF: it does NOT create a continuous loop by itself. You schedule ONE callback. That callback fires ONCE. If you want a continuous loop, you must schedule the NEXT callback from inside the current one.

Here is the minimal pattern:

```js
function animate(timestamp) {
  // Do work here — update positions, render, etc.
  // timestamp is a high-precision time in milliseconds

  requestAnimationFrame(animate); // Schedule the next frame
}

requestAnimationFrame(animate); // Start the loop
```

The first `requestAnimationFrame(animate)` call at the bottom starts the process. When the browser is ready to paint, it calls `animate(timestamp)`. Inside `animate`, you do your work and then call `requestAnimationFrame(animate)` again, scheduling the next call. This creates a self-perpetuating loop that fires once per frame.

If you never call `requestAnimationFrame` again from inside the callback, the loop stops after one frame.

---

## 3. Starting and Stopping

To stop the loop, you need the ID that `requestAnimationFrame` returns when you call it. You pass that ID to `cancelAnimationFrame`:

```js
let rafId = null;

function start() {
  function animate(timestamp) {
    // ... do work ...
    rafId = requestAnimationFrame(animate); // Save the ID
  }
  rafId = requestAnimationFrame(animate);
}

function stop() {
  cancelAnimationFrame(rafId);
}
```

In React, you store the RAF ID in a ref (not state — see Lesson 4) so you can cancel it without triggering a re-render:

```jsx
function AnimatedBox() {
  const rafIdRef = useRef(null);
  const [x, setX] = useState(0);

  function startAnimation() {
    function animate() {
      setX(prev => prev + 1);
      rafIdRef.current = requestAnimationFrame(animate);
    }
    rafIdRef.current = requestAnimationFrame(animate);
  }

  function stopAnimation() {
    cancelAnimationFrame(rafIdRef.current);
  }

  return (
    <div>
      <div style={{ transform: `translateX(${x}px)` }}>Box</div>
      <button onClick={startAnimation}>Start</button>
      <button onClick={stopAnimation}>Stop</button>
    </div>
  );
}
```

---

## 4. The Timestamp Argument

RAF passes a high-precision timestamp (in milliseconds) to your callback. This is the time since the page loaded, measured very precisely. You can use it to compute how much time has elapsed since the last frame — which is exactly what the fixed timestep pattern (Lesson 8) requires.

```js
let lastTime = performance.now();

function animate(now) {
  const elapsed = now - lastTime; // How many milliseconds since last frame
  lastTime = now;

  // Use elapsed to advance physics
  // ...

  requestAnimationFrame(animate);
}
```

The elapsed time between frames is typically around 16 ms on a 60 Hz monitor, 8 ms on a 120 Hz monitor, and 7 ms on a 144 Hz monitor. It is never exactly the same twice. Your physics update must handle variable elapsed times gracefully — which is the topic of Lesson 8.

---

## 5. With It vs. Without It

Using `setInterval` for animation:

```js
setInterval(() => {
  // Update every 16ms regardless of when the browser is ready to paint
  updatePhysics(16); // Assumed 16ms — may be wrong
  render();
}, 16);
```

Problems with setInterval: it fires on its own clock, not the browser's paint clock. If the tab is hidden, it still fires (wastes CPU). If the monitor runs at 144 Hz, it misses most frames. If the monitor runs at 30 Hz, it fires twice between paints (wasted work). The interval time you pass is approximate — `setInterval(fn, 16)` will often fire at 17ms or 18ms.

Using RAF:

```js
function animate(now) {
  updatePhysics(now - lastTime);
  lastTime = now;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

RAF is perfectly synchronized with the display. When the tab is hidden, RAF pauses (saving CPU). When the tab is visible again, it resumes. The timestamp is precise. The callback fires exactly once before each paint.

---

## 6. Common Mistakes

**Starting multiple loops.** If you call `requestAnimationFrame(animate)` twice without cancelling the first loop, you have two loops running simultaneously — physics advances twice per frame, animations run at double speed. Always cancel the existing loop before starting a new one.

**Not cancelling on cleanup.** In React, if you start a RAF loop in a `useEffect` and do not cancel it in the cleanup function, the loop continues running even after the component is gone. This causes errors when the callback tries to call `setState` on an unmounted component, or worse, silently runs forever.

**Reading state inside the loop without the mirror ref pattern.** After Lesson 6 you know this one: the callback captures state at creation time. Without mirror refs, you read stale values. Never forget to read from refs, not directly from state, inside a long-lived RAF callback.

---

## 7. Practice Exercise

Animate a number from 0 to 100 over exactly 2 seconds using RAF, and display it in a React component. The animation should stop when it reaches 100:

```jsx
function AnimatedProgress() {
  const [progress, setProgress] = useState(0);
  const rafIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const DURATION = 2000; // 2 seconds in ms

  function startAnimation() {
    startTimeRef.current = null; // Will be set on first frame

    function animate(now) {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const rawProgress = (elapsed / DURATION) * 100;
      const clampedProgress = Math.min(100, rawProgress);

      setProgress(Math.floor(clampedProgress));

      if (clampedProgress < 100) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    }

    rafIdRef.current = requestAnimationFrame(animate);
  }

  return (
    <div>
      <p>Progress: {progress}%</p>
      <button onClick={startAnimation}>Start</button>
    </div>
  );
}
```

Notice that when progress reaches 100, you stop calling `requestAnimationFrame`. The loop ends naturally. Also notice that you are computing progress from a start timestamp, not from a counter — this ensures the animation takes exactly 2 seconds regardless of frame rate.

---

## 8. In This Project

`useSimulationLoop.js` starts a RAF loop inside a `useEffect`. Here is the structure (simplified):

```js
useEffect(() => {
  let raf;
  let accumulator = 0;

  function loop(now) {
    const frameTime = (now - last.current) / 1000;
    last.current = now;

    if (playing) {
      accumulator += frameTime;
      while (accumulator >= FIXED_TIMESTEP) {
        // ... advance physics or playback ...
        accumulator -= FIXED_TIMESTEP;
      }
    }

    raf = requestAnimationFrame(loop);
  }

  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf); // Cleanup: cancel the loop
}, [playing, setSimulation, setData, setPlaying]);
```

A few things to notice:

The `useEffect` has `playing` in its dependency array. When `playing` changes (user hits play or pause), the old loop is cancelled (cleanup runs), and a new loop starts with a fresh closure that captures the current `playing` value. The accumulator resets to 0 on each restart, which is fine — a small reset on play/pause is imperceptible.

The loop reads `last.current` for the previous frame's timestamp. `last` is a ref (`useRef(performance.now())`) — it persists across renders and accumulates the frame time history across many RAF callbacks.

The loop only advances physics when `playing` is `true`. When `playing` is `false`, the `if (playing)` block is skipped and the loop just keeps scheduling itself, doing nothing until play resumes. This is more efficient than cancelling and restarting the loop on every pause, because it avoids the overhead of scheduling a new effect.

`cancelAnimationFrame(raf)` in the cleanup ensures that when `playing` changes and the effect re-runs, the old loop is cancelled before the new one starts. Without this, both loops would run simultaneously and physics would advance twice per frame.

In Lesson 8 you will learn how the accumulator pattern inside this loop ensures the physics always runs at exactly 24 steps per second, regardless of monitor refresh rate.
