# Lesson 0: Project Overview

---

## What This App Does (Plain English)

Imagine you throw a ball straight forward — no curves, no up or down, just a straight line. The ball starts at some position, has some initial speed, and gravity (or some other force) is either pushing it forward or slowing it down. This app lets you set those starting conditions and then watch what happens.

Here is the full user experience in plain English:

1. You type in a starting position (where the ball begins), a starting velocity (how fast it is going), and an acceleration (how much that speed changes per second). These numbers go in text boxes on the right side of the screen.
2. You press Record. A timer starts counting. The ball — shown as an orange rectangle on a horizontal ruler — begins to move. Three graphs appear on the left, drawing curves in real time: one for position, one for velocity, one for acceleration.
3. You press Pause. The ball freezes. The graphs show everything that was recorded.
4. You switch to Playback mode. Now you can drag your mouse across any of the graphs, and the ball scrubs back and forth through the recorded history — like rewinding and fast-forwarding a video. A gray vertical line on the graphs shows you exactly where in time you currently are.
5. You press Reset to start over and try different numbers.

That is the whole app. It is a tool for visualizing constant-acceleration motion in one dimension.

---

## Data Flow Diagram

Here is how information moves through the app:

```
+------------+       props        +------------------+
|  Controls  | ----------------> |  Simulation3D    |
|  (inputs,  |                   |  (3D ruler +     |
|  buttons)  |                   |   moving sprite) |
+-----+------+                   +------------------+
      |
      | callbacks
      v
+----------------------------------+
|            App.jsx               |
|   (holds ALL state — simulation, |
|    playing, data)                |
+--------+-----------+-------------+
         |           ^
   props |           | setSimulation / setData
         v           |
+------------+   +---------------------------+
|  Charts    |   |  useSimulationLoop        |
|  (graphs,  |   |  (physics loop, RAF,      |
|  scrubbing)|   |   fixed timestep)         |
+-----+------+   +---------------------------+
      |
      | onSetPlaybackTime callback
      +-----> App.jsx
```

**App.jsx** is the center of everything. It holds all the state and acts as the single source of truth. Every other piece either receives data from App or sends events back to App.

**Controls** is a panel of inputs and buttons on the right. It reads the current simulation values from props and calls callbacks (like `onSimulationChange`, `onTogglePlayPause`, `onReset`) to tell App when the user does something.

**useSimulationLoop** is the physics engine runner. It lives inside App as a custom hook and drives the animation. On every physics tick it calls `setSimulation` and `setData` to push new values into App's state.

**Simulation3D** is the 3D view at the top — a ruler with an orange sprite that moves. It receives the current `position` as a prop and simply renders the sprite at that position. It has no state of its own.

**Charts** renders three line graphs (position, velocity, acceleration vs. time). It reads the recorded data from props. When the user drags on a graph in playback mode, it calls the `onSetPlaybackTime` callback to tell App where to scrub.

---

## Concepts You Will Learn

| Concept | What it does in THIS project | Taught in Lesson |
|---|---|---|
| React components and props | Every file in `src/components/` is a component. Each receives its data as props from App and renders it. | 1 |
| useState | App.jsx holds three pieces of state: `simulation`, `playing`, and `data`. Changing any of them re-renders the app and updates the screen. | 2 |
| Lifting state up | All state lives in App, not in the child components. Controls and Charts use callbacks to push changes up to App. | 3 |
| useRef | The physics loop uses refs to store the frame timer and accumulator without causing re-renders. Controls uses a ref to remember the last valid input value. | 4 |
| useEffect | Controls uses useEffect to sync its local input text with the simulation state when App resets. The loop uses useEffect for startup and cleanup. | 5 |
| Mirror ref pattern | The RAF callback keeps simulationRef and dataRef in sync with current state so it always reads fresh values. | 6 |
| requestAnimationFrame | The physics loop schedules itself with RAF for smooth, display-synchronized animation. | 7 |
| Fixed timestep / accumulator | The loop runs physics at exactly 24 steps per second regardless of whether the monitor runs at 60 Hz or 144 Hz. | 8 |
| React Three Fiber | The 3D ruler and moving sprite are rendered with R3F components inside a `<Canvas>`. The sprite's position updates reactively when the `position` prop changes. | 9 |
| Chart.js | Three `<Line />` charts from `react-chartjs-2` display the recorded data. They re-render when props change. | 10 |
| Chart.js annotation plugin | A gray dashed vertical line drawn on top of each chart marks the current simulation time during playback. | 11 |

---

## Why Start With an Overview?

Learning twelve isolated concepts in sequence without a map is like being handed twelve puzzle pieces and told to study each one individually. You can describe the color and shape of every piece by the time you finish, but you still do not know what the puzzle looks like. Worse, you reach Lesson 6 and cannot remember why you are learning about stale closures, because you have lost track of what problem they solve.

The overview gives you the assembled puzzle first. Each later lesson takes one piece out, examines it closely, puts it back in place, and lets you see how it fits with the others. That is a fundamentally different learning experience. When you hit the stale closure problem in Lesson 6, you already know it is the problem the physics loop has — you saw it in this diagram.

---

## Your Goal After This Lesson

You should be able to describe what this app does and name all its major pieces, even though you do not yet understand how any piece works. That is enough. The rest of the curriculum fills in the how.

Specifically, after reading this overview you should be able to answer:
- What does the user actually do with this app?
- Where does all the state live?
- What is the job of `useSimulationLoop`?
- What does `Simulation3D` receive and what does it render?
- What is the job of `Charts` and how does scrubbing work at a high level?

If you can answer those five questions in plain English, move on to Lesson 1.
