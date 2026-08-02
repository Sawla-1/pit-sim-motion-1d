# Smooth Scrubbing + a Chart That Doesn't Slow Down

Two changes made on the `phet-style-redesign` branch, both aimed at the same root cause: recording now runs at real, variable frame rate instead of a fixed 24 FPS grid, so `recordedData` samples land at irregular time gaps and the array can grow much faster than before.

## 1. Playback/scrubbing interpolates instead of snapping

**Where:** [`interpolateStateAtTime`, engine/playback.js:18-44](../../src/engine/playback.js#L18)

### The old behavior — `findClosestState`

Scanned every saved sample and returned whichever one's `time` was numerically closest to the target. With samples landing at irregular gaps (variable frame rate), "closest" can still be tens of milliseconds away — visible as a snap/jitter while scrubbing or during playback.

### The new behavior — `interpolateStateAtTime`

Binary-searches for the two samples bracketing the target time (`recordedData` is always time-sorted — recording only appends), then blends between them.

**Real numbers.** Say two consecutive recorded samples are:

```js
{ time: 1.00, position: 5.0, velocity: 4.0, acceleration: 1.0 }
{ time: 1.05, position: 5.3, velocity: 4.05, acceleration: 1.0 }
```

You scrub to `t = 1.02`.

| | old (`findClosestState`) | new (`interpolateStateAtTime`) |
|---|---|---|
| logic | picks nearer of the two → `t=1.00` (0.02s away) beats `t=1.05` (0.03s away) | `t = (1.02 - 1.00) / (1.05 - 1.00) = 0.4` → 40% of the way from the first sample to the second |
| position shown | `5.0` | `5.0 + 0.4 × (5.3 - 5.0) = 5.12` |
| velocity shown | `4.0` | `4.0 + 0.4 × (4.05 - 4.0) = 4.02` |

The old value is just wrong for `t=1.02` — it's the value from `t=1.00`. The new value is the actual interpolated physical state at that instant.

**Acceleration is the one field that's *not* blended** — it holds `prev.acceleration` instead ([playback.js:42](../../src/engine/playback.js#L42)). Acceleration only changes when the user edits the control, so it's a step function, not a continuous quantity; blending it would draw a fake ramp for one frame at the moment of a real, instantaneous change.

**Also fixes a growing cost.** The old scan was O(n) — checked every sample, every scrub frame. Binary search is O(log n): at 18,000 samples (5 minutes at 60 fps) that's ~18,000 comparisons down to ~15.

Used by both [`handlePlaybackStep`](../../src/engine/playback.js#L73) (auto playback) and `App.jsx`'s `handleSetPlaybackTime` (chart drag-scrub).

## 2. Chart drawing cost stays flat, however long you record

**Where:** [`Charts.jsx`](../../src/components/Charts.jsx) — imports at lines 4-13, plugin config at lines 102-146.

### The old behavior

`buildChartData` fed *all* of `data.recordedData` to Chart.js, every render. Chart.js redraws the entire line on every frame, so cost scales with total points recorded, not with anything visible on screen.

**Real numbers.** Recording at 60 fps:

| recorded duration | points fed to the chart, every frame |
|---|---|
| 10 seconds | ~600 |
| 1 minute | ~3,600 |
| 5 minutes | ~18,000 |

The 5-minute case redraws 18,000 points 60 times a second — the longer you record, the slower every frame gets.

### The new behavior — Chart.js's decimation plugin

Registered `Decimation` ([Charts.jsx:10, 21](../../src/components/Charts.jsx#L10)) and turned it on with the `min-max` algorithm ([Charts.jsx:134-137](../../src/components/Charts.jsx#L134)), plus `parsing: false` ([Charts.jsx:110](../../src/components/Charts.jsx#L110)) which the plugin requires.

Decimation looks at the **currently visible time range** and only draws roughly one point per pixel of chart width, not every recorded sample.

**Real numbers.** Chart is roughly 800px wide:

| recorded duration | points fed in | points actually drawn |
|---|---|---|
| 10 seconds | ~600 | ~600 (fewer than 800px worth, drawn as-is) |
| 5 minutes | ~18,000 | ~800-1,600 (whatever fits the width) |

Same draw cost either way — it's bounded by pixels on screen, not by how long you've been recording. `min-max` was chosen over the other option (`lttb`) because it keeps peaks and dips in the data (e.g. a quick speed spike) instead of smoothing them away.

Because decimation is range-aware, zooming into a 2-second window during playback re-decimates *for that window* and shows full detail — a fixed-count downsample (e.g. "always show 500 points total") was considered and rejected for this reason: it would have discarded detail before Chart.js ever saw it, so zooming in on a long recording would've shown nothing new.

### Zoom/pan restricted to playback mode

**Where:** [Charts.jsx:102, 140, 142](../../src/components/Charts.jsx#L102)

`isPlayback = data.selectedMode === "playback"` now gates both `zoom.wheel.enabled` and `pan.enabled`. This wasn't really a new restriction so much as making the code honest about behavior that already existed: the x-axis `max` is recomputed to `maxTime` on every single render ([Charts.jsx:115](../../src/components/Charts.jsx#L115)), and `maxTime` grows every frame while recording — so any zoom/pan applied during live recording was already being wiped out on the very next frame. Now zoom/pan simply doesn't turn on until you're in playback, where the axis is stable and a zoom actually sticks.
