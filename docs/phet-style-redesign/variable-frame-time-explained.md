# Real Per-Frame Delta Instead of a Fixed 24 FPS Accumulator

First change on the `phet-style-redesign` branch, commit `c2ae52b`. Everything else on this branch ([interpolated-scrubbing-and-chart-decimation-explained.md](interpolated-scrubbing-and-chart-decimation-explained.md)) exists to handle the consequences of this one: recording no longer produces evenly-spaced samples.

**Where:** [`useSimulationLoop.js`](../../src/hooks/useSimulationLoop.js)

## The old behavior — fixed timestep with an accumulator

```js
let accumulator = 0;
const FIXED_TIMESTEP = 1 / 24; // 0.04167s

function loop(now) {
  const frameTime = (now - last.current) / 1000;
  accumulator += frameTime;
  while (accumulator >= FIXED_TIMESTEP) {
    // ...advance physics by exactly FIXED_TIMESTEP...
    accumulator -= FIXED_TIMESTEP;
  }
}
```

Physics always advanced in fixed 0.04167s chunks, regardless of the display's actual refresh rate. On a 60Hz screen (frames ~16.7ms apart), a physics step only fired roughly every 2-3 rendered frames — the `while` loop existed to let a slow frame "catch up" by running multiple steps in one go.

**Real number — a bad stall.** Say the tab was backgrounded for 5 minutes and the browser throttles `requestAnimationFrame` while hidden, so the very next frame after returning sees `frameTime = 300s`.

- `accumulator += 300` → the `while` loop runs `300 / 0.04167 ≈ 7,200` physics steps synchronously, in one JS callback, before the browser can paint anything.
- That's also 7,200 new entries appended to `recordedData` in a single instant, and the simulated position jumps to wherever 5 minutes of motion would have carried it — visually, the object just teleports.

## The new behavior — real elapsed time, clamped

```js
const MAX_FRAME_TIME = 0.1; // seconds

function loop(now) {
  const frameTime = Math.min((now - last.current) / 1000, MAX_FRAME_TIME);
  last.current = now;
  // ...advance physics by exactly frameTime, once, this frame...
}
```

([useSimulationLoop.js:71-75](../../src/hooks/useSimulationLoop.js#L71))

No accumulator, no `while` loop — physics advances by whatever time actually passed since the last frame, once per frame. On a 60Hz screen that's normally `frameTime ≈ 0.0167s`, varying slightly frame to frame instead of landing on a fixed grid. That's *why* `recordedData` samples are no longer evenly spaced, which is what motivated the interpolation and decimation work described in the companion doc.

**Same stall, new behavior.** `frameTime` is clamped to `MAX_FRAME_TIME = 0.1s` ([useSimulationLoop.js:71](../../src/hooks/useSimulationLoop.js#L71)), so a single bad frame can only ever advance the simulation by 0.1s of physics time, no matter how long the real gap was. No 7,200-step burst, no teleport — just a slightly-behind clock.

**But the real fix for the 5-minute-hidden-tab case is the new visibility listener**, not the clamp:

```js
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setPlaying(false);
    last.current = performance.now();
  }
});
```

([useSimulationLoop.js:54-64](../../src/hooks/useSimulationLoop.js#L54))

The moment the tab is hidden, playback/recording auto-pauses and `last.current` is stamped fresh. So by the time the user comes back, `playing` is already `false` — the loop does nothing until they press Play again, and the first frame after that sees a normal, small `frameTime` rather than a 5-minute-old timestamp. The 0.1s clamp is still there as a backstop for smaller stalls (e.g. the OS briefly deprioritizing the tab without fully hiding it), but the visibility listener is what handles the case that actually matters.
