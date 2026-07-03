# Lesson 8: Fixed Timestep / Accumulator Pattern

**Placement note:** This lesson comes directly after Lesson 7 (RAF) because it is the answer to a problem that RAF creates: RAF fires at the display refresh rate (60 Hz, 120 Hz, 144 Hz, etc.) but physics should advance at a fixed rate regardless of display speed. You need to understand RAF first (Lesson 7) to appreciate why the display refresh rate and the physics timestep must be decoupled.

---

## 0. Why This Lesson Is Here

After Lesson 7 you know that `requestAnimationFrame` fires once before each screen paint — 60 times per second on a 60 Hz monitor, 144 times per second on a 144 Hz monitor. If you advance physics once per RAF call, the simulation runs at different speeds on different hardware. A user on a 144 Hz monitor sees the simulation running 2.4 times faster than a user on a 60 Hz monitor. This is the famous "Turbo mode" bug from old DOS games: they ran physics tied to the CPU clock, and on faster machines everything moved faster.

The accumulator pattern fixes this by separating the physics clock from the display clock.

---

## 1. The Problem: Variable Timesteps

Imagine a ball moving at 1 meter per second. If you advance physics once per frame at 60 Hz, each frame advances the ball by `1 × (1/60) = 0.0167` meters. At 144 Hz, each frame advances it by `1 × (1/144) = 0.0069` meters. Same ball, same velocity, but on the faster monitor the ball travels more total distance per second because the physics loop runs more times per second.

This is not just a speed problem for physics simulations. It also produces non-deterministic behavior: the same initial conditions can produce different outcomes depending on hardware. For a physics demo like this one, it also affects the chart data: at 144 Hz, you would record 144 data points per second; at 60 Hz, only 60. The graphs would look different on different machines.

---

## 2. The Fix: Fixed Timestep

Decide on a physics update rate that never changes. In this project, it is 24 Hz — physics advances in steps of exactly `1/24 ≈ 0.04167` seconds. Every call to `calculatePhysicsStep` uses this exact delta time, always. The physics is deterministic and hardware-independent.

But you still call physics from a RAF loop that fires at the display refresh rate. How do you reconcile these? With an accumulator.

---

## 3. The Accumulator Pattern

The idea: keep track of how much real time has accumulated since the last physics step. When enough time has accumulated for one or more physics steps, run those steps and subtract the time consumed.

```
accumulator += frameTime  (how much time passed since last frame)

while (accumulator >= FIXED_TIMESTEP) {
  advancePhysics(FIXED_TIMESTEP)
  accumulator -= FIXED_TIMESTEP
}

lastFrameTime = now
```

Here is what this looks like on a timeline. Suppose your display runs at 60 Hz and your physics runs at 24 Hz:

```
Real time:    0ms     16ms     33ms     50ms     66ms     83ms
RAF fires:    |        |        |        |        |        |
              
Accumulator:  0       +16ms    +16ms    +16ms    +16ms    +16ms
              
Physics step is 41.67ms (1/24 second)

Frame 1: accumulator = 16ms  → below 41.67ms → no physics step yet
Frame 2: accumulator = 32ms  → below 41.67ms → no physics step yet
Frame 3: accumulator = 48ms  → above 41.67ms → run ONE physics step, accumulator = 6ms
Frame 4: accumulator = 22ms  → below 41.67ms → no physics step yet
Frame 5: accumulator = 38ms  → below 41.67ms → no physics step yet
Frame 6: accumulator = 54ms  → above 41.67ms → run ONE physics step, accumulator = 12ms
```

Every ~2–3 display frames, exactly one physics step runs. On a 144 Hz monitor, the RAF fires more frequently, but the accumulator fills up at the same rate (determined by real time). The physics still runs at exactly 24 steps per second.

If a frame takes unusually long (the user's machine hiccuped), the accumulator might overflow enough for two physics steps in one frame. The `while` loop handles this correctly — it runs as many steps as the accumulated time requires, then leaves the remainder for next frame.

---

## 4. Why 24 FPS for This Project?

24 Hz was chosen deliberately for this physics simulator. A few reasons:

First, it produces clean, consistent graph data. At 24 Hz, each data point is exactly 1/24 second apart in time. The position vs. time graph for constant acceleration is a clean parabola; the velocity graph is a clean straight line. At 60 Hz, the graphs would have more points than necessary and the visual result is the same.

Second, 24 Hz matches the real-time display timer. The recorded time values use the system clock (wall time), which is compared against `recordRealTimeStart`. At 24 Hz, each step's recorded time is a clean multiple of 1/24.

Third, 24 is enough. For 1D kinematics with constant acceleration, more steps per second do not improve accuracy because the physics is exact at any timestep (constant acceleration has an analytical solution). The fixed timestep here is about determinism and consistent recording, not numerical accuracy.

---

## 5. With It vs. Without It

Without a fixed timestep — advancing physics once per frame:

```js
function loop(now) {
  const frameTime = (now - lastTime) / 1000;
  lastTime = now;
  advancePhysics(frameTime); // Variable! Changes with display rate
  requestAnimationFrame(loop);
}
```

On a 60 Hz monitor: physics step is ~0.0167s. On 144 Hz: ~0.0069s. The recorded data has different time spacing. The graphs show different numbers of points. The simulation behavior is hardware-dependent.

With the fixed timestep accumulator:

```js
const FIXED_TIMESTEP = 1 / 24;

function loop(now) {
  const frameTime = (now - lastTime) / 1000;
  lastTime = now;
  accumulator += frameTime;

  while (accumulator >= FIXED_TIMESTEP) {
    advancePhysics(FIXED_TIMESTEP); // Always exactly 1/24 second
    accumulator -= FIXED_TIMESTEP;
  }

  requestAnimationFrame(loop);
}
```

On any monitor: physics step is always exactly 1/24 second. The recorded data always has the same time spacing. The graphs look the same everywhere. The simulation is deterministic.

---

## 6. Common Mistakes

**Accumulator growing unbounded.** If the physics calculation takes longer than the fixed timestep (very slow hardware or a very complex simulation), the accumulator grows faster than it can be drained. The `while` loop runs more and more steps per frame, which takes even longer, creating a death spiral. The fix is to cap the accumulator: `accumulator = Math.min(accumulator, MAX_ACCUMULATED_TIME)`. For this simple simulation it is not a concern, but it is good practice.

**Using floating-point time carelessly.** Floating-point arithmetic is not exact. After thousands of steps, `accumulator -= FIXED_TIMESTEP` repeated many times can accumulate small errors. For a short-running physics demo this is irrelevant, but in production physics engines it matters.

**Storing timing values as state instead of refs.** The accumulator and the last-frame timestamp change 60+ times per second. If they were state, they would trigger 60+ re-renders per second, each of which is wasted work. They must be refs or local `let` variables inside the effect.

---

## 7. Practice Exercise

Build a counter that advances by exactly 1 unit per simulated second, regardless of frame rate. It should print the count to the screen and log the timestamps to verify it runs at the same rate whether the browser is throttled or not:

```jsx
function FixedTimestepCounter() {
  const [count, setCount] = useState(0);
  const lastFrameRef = useRef(performance.now());
  const accumulatorRef = useRef(0);
  const STEP = 1; // 1 second per count

  useEffect(() => {
    let raf;
    const FIXED_TIMESTEP = 1.0; // 1-second steps for easy verification

    function loop(now) {
      const frameTime = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;
      accumulatorRef.current += frameTime;

      while (accumulatorRef.current >= FIXED_TIMESTEP) {
        setCount(prev => prev + STEP);
        accumulatorRef.current -= FIXED_TIMESTEP;
      }

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <p>Count (advances 1/second): {count}</p>;
}
```

Open the browser's performance throttling, slow the CPU by 4x, and verify the counter still advances at approximately 1 per second. The physics is decoupled from the display rate.

---

## 8. In This Project

Open `src/hooks/useSimulationLoop.js`. Inside the `useEffect`, you will find the accumulator pattern:

```js
let raf;
let accumulator = 0;
const FIXED_TIMESTEP = 1 / 24;

function loop(now) {
  const frameTime = (now - last.current) / 1000;
  last.current = now;

  if (playing) {
    accumulator += frameTime;
    while (accumulator >= FIXED_TIMESTEP) {
      const sim = simulationRef.current;
      const dat = dataRef.current;
      // ... physics or playback step ...
      accumulator -= FIXED_TIMESTEP;
    }
  }

  raf = requestAnimationFrame(loop);
}
```

Notice that `accumulator` is a local `let` variable inside the `useEffect`, not a `useRef`. It does not need to be a ref because:

1. It only needs to survive between RAF frames within one "session" of the loop running.
2. When `playing` changes, the `useEffect` re-runs (because `playing` is in the deps array), the cleanup cancels the old loop, and the new loop starts with a fresh `accumulator = 0`. This is correct behavior — a short reset of the accumulator when play/pause toggles is imperceptible.

`last` IS a ref (`useRef(performance.now())`), because it needs to survive across multiple effect sessions. When the loop restarts after `playing` changes, `last.current` still holds the timestamp from the previous frame, preventing a large spurious `frameTime` on the first frame of the new session.

`calculatePhysicsStep` (in `src/engine/kinematics1d.js`) receives `FIXED_TIMESTEP` as `deltaTime`. It uses the average-velocity method: computes the new velocity, averages it with the old velocity, and advances position by the average velocity times the timestep. This is exact for constant acceleration. The recorded time uses the real wall-clock elapsed time (from `recordRealTimeStart`) rather than the accumulated simulation time, which ensures the displayed timer matches real elapsed time even across pauses.
