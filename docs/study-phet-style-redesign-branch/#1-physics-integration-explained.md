# Logic #1 Explained: `calculatePhysicsStep`

File: `src/engine/kinematics1d.js:12-24`

## 1. What does `calculatePhysicsStep` do?

### Quick Note

It's the one function that moves the simulation forward by one tick of time.

### Answer

```js
export function calculatePhysicsStep(simulation, deltaTime) {
  const newVelocity = simulation.velocity + simulation.acceleration * deltaTime;
  const avgVelocity = (simulation.velocity + newVelocity) / 2;
  const newPosition = simulation.position + avgVelocity * deltaTime;
  const newTime = simulation.time + deltaTime;

  return {
    position: newPosition,
    velocity: newVelocity,
    time: newTime,
    acceleration: simulation.acceleration,
  };
}
```

It's a **pure function** — a function whose output depends only on its inputs, with no side effects (it doesn't change anything outside itself).

- **Inputs:** `simulation = { position, velocity, acceleration, time }`, plus `deltaTime` (seconds elapsed).
- **Output:** a brand-new state object of the same shape. `acceleration` is passed through unchanged — this function never changes it on its own; something else (a user typing a new value) does that.

**The math, step by step:**

1. `newVelocity = velocity + acceleration * deltaTime` — standard `v = v0 + a·t`.
2. `avgVelocity = (velocity + newVelocity) / 2` — average of the start and end velocity.
3. `newPosition = position + avgVelocity * deltaTime` — uses that *average* velocity, not just the starting one, to move position forward.
4. `newTime = time + deltaTime` — clock just advances.

Analogy: like a car's trip computer averaging start and end speed each tick, instead of assuming the car stayed at its starting speed the whole time.

## 2. Where do these formulas come from?

### Quick Note

They're 2 of the 4 standard equations for motion with constant acceleration — and the code's position formula can be *derived* from the other two.

### Answer

**The four kinematic equations for constant acceleration.**

Given initial velocity `v0`, final velocity `v`, acceleration `a`, time `t`, displacement `Δx = x - x0`:

1. `v = v0 + a·t`
2. `x = x0 + v0·t + ½·a·t²`
3. `v² = v0² + 2·a·Δx`
4. `x = x0 + ((v0 + v)/2)·t` — the "average velocity" form

The code uses **#1** to get `newVelocity`, then **#4** to get `newPosition`. Equations #2 and #3 aren't used directly, but #4 is derived from #1 and #2.

**Deriving #4 (why average velocity works).**

Start from #2:
```
x = x0 + v0·t + ½·a·t²
```
From #1, `a·t = v − v0`, so `a·t² = (v − v0)·t`. Substitute:
```
x = x0 + v0·t + ½·(v − v0)·t
  = x0 + t·(v0 + (v − v0)/2)
  = x0 + t·((v0 + v)/2)
```
That's exactly #4 — and exactly what the code computes.

**This isn't an approximation.** Because acceleration is constant, velocity is a straight line over the step, so the average of the endpoint velocities *equals* the true average velocity over that interval. Equation #4 gives the exact analytic position for each step, no matter how large `deltaTime` is.

## 3. Why not the simpler `position += velocity * deltaTime`?

### Quick Note

That simpler line is called **Euler integration** — it's easier to write, but it's wrong by a predictable amount whenever there's acceleration. The average-velocity form the code uses has zero error, so it wins.

### Answer

That's the naive alternative — Euler integration — which only uses the *starting* velocity for the whole step:
```js
newPosition = position + velocity * deltaTime   // uses v0 only
```
This assumes velocity stays at `v0` for the entire step, ignoring that it's ramping up (or down) due to acceleration. The error per step is:
```
true Δx − Euler Δx = ½·a·t²
```
This error grows with both `a` and `deltaTime²`, and only becomes negligible if `deltaTime` is tiny (many small steps). `useSimulationLoop.js` uses a real, variable per-frame `deltaTime` (the actual wall-clock gap between RAF ticks, clamped to `MAX_FRAME_TIME = 0.1s` so a stalled frame can't inject a huge jump) rather than a fixed timestep — so on a slower frame, `deltaTime` can be much larger than a typical ~0.0167s (60 FPS) frame, and Euler would visibly undershoot position under acceleration on exactly those larger steps. The average-velocity form is exact regardless of step size — fixed or variable — which is why the codebase uses it instead.

### Extra Tips

**Where the name "Euler" comes from:** it's a person's name, not an acronym — it refers to Leonhard Euler, an 18th-century mathematician.

Euler's method is the simplest numerical way to step through a changing quantity: take the current rate of change, hold it fixed for one small step, and move forward using only that starting rate. That's exactly what `position += velocity * deltaTime` does — it takes the rate of change of position (velocity) and holds it fixed for the step.

The name applies regardless of what quantity it's used on — it's called "Euler's method" or "Euler integration" in numerical math generally, not something specific to physics or position. It's also the simplest member of a larger family of numerical integrators — others include the midpoint method and Runge-Kutta methods, which take extra samples of the rate of change within a step to reduce error.

**Caveat for later:** the average-velocity trick in `calculatePhysicsStep` is exact only because acceleration is constant here, so velocity is a straight line over the step. If a future simulation has varying acceleration, velocity won't be a straight line anymore, and that exactness won't necessarily hold.

**Why this is the starting point for studying the codebase:** `calculatePhysicsStep` defines the state shape `{ position, velocity, acceleration, time }` that every other piece of logic — recording, playback, App state, charts, 3D view — produces or consumes. Once this shape and its math are understood, everything downstream is just "who reads/writes it, and when."

## 4. Is Euler's method wrong, and which came first?

### Quick Note

Euler's method isn't wrong in general — it's only suboptimal *here* because constant acceleration happens to have an exact closed-form solution (the kinematic equations). People still use Euler's method because most real physics doesn't have an exact formula at all.

### Answer

Euler's method is a general-purpose way to numerically approximate any changing quantity, even ones with no exact formula. It's only an "error" in this codebase specifically because using an approximation when an exact answer is available (the kinematic equations) throws away accuracy for no reason.

**Why people still use it, generally:**

- **Simple and cheap** — one multiply, one add per step.
- **Good enough for small timesteps** — the error shrinks fast as `deltaTime` shrinks.
- **The standard teaching starting point** for numerical integration.
- **It generalizes.** Most real physics — varying acceleration, forces that depend on position or velocity, air resistance, springs, orbits, multi-body systems — has no exact formula at all. Euler's method and its better relatives (like Runge-Kutta) are often the *only* way to compute an answer.

Analogy: the kinematic equations are a calculator with a button for one specific problem; Euler's method is a generic ruler you can lay against almost any curve — less precise, but it works even when there's no special button for the problem at hand.

**Which came first:**

| Idea | Who / When |
|---|---|
| Constant-acceleration motion equations | Galileo, early 1600s (experimentally); formalized with calculus by Newton, late 1600s |
| Euler's method | Published 1768 by Leonhard Euler (1707-1783) — about 150 years later |

Euler wasn't trying to replace the kinematic equations. He built his method as a general tool for solving differential equations that don't have closed-form solutions — the kinematic equations were already a solved special case by the time he published it.

### Extra Tips

This ties back to the **"Caveat for later"** note in block 3's Extra Tips above: the moment a future simulation has non-constant acceleration, the exact kinematic formulas stop applying, and something Euler-like becomes necessary — not just "simpler," but the only practical option.
