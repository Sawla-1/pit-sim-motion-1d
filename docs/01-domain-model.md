# Domain Model

## What this simulation models

A single point mass moving along a 1D axis under constant acceleration. This is the simplest non-trivial kinematics problem: the three kinematic quantities — position, velocity, and acceleration — are all linked by calculus, but acceleration is held constant so the math stays polynomial.

## Physics quantities

| Quantity | Symbol | Unit | Range in UI |
|---|---|---|---|
| Position | x | meters (m) | −10 to +10 |
| Velocity | v | meters per second (m/s) | −10 to +10 |
| Acceleration | a | meters per second squared (m/s²) | −10 to +10 |
| Time | t | seconds (s) | 0 → unbounded |

## Kinematic equations used

The engine uses the **average-velocity method** (also called the trapezoid rule), which is more accurate than Euler integration for constant acceleration:

```
v_new = v + a·Δt
x_new = x + ((v + v_new) / 2) · Δt
```

This is exact for constant acceleration because the average velocity over a constant-acceleration interval equals the true integral. See `src/engine/kinematics1d.js:calculatePhysicsStep`.

## Simulation state shape

```js
{
  position: number,      // current x in meters
  velocity: number,      // current v in m/s
  acceleration: number,  // constant a in m/s² (user-controlled)
  time: number,          // elapsed simulation time in seconds
  playing: boolean,      // whether the loop is advancing
}
```

Acceleration is treated as a parameter the user sets, not a derived quantity. It does not change during a recording run.

## Recorded state shape

Each tick in recording mode appends one snapshot to `recordedData`:

```js
{
  time: number,
  position: number,
  velocity: number,
  acceleration: number,
}
```

This is the data source for all three charts and for playback seeking.
