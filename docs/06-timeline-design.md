# Timeline Design

## What the timeline is

There is no dedicated timeline slider component. Instead, each Chart.js canvas is itself a drag target. Dragging horizontally across any chart in playback mode scrubs the simulation to the corresponding time.

## Chart annotation line

A vertical dashed line tracks `simulation.time` on every chart, implemented via `chartjs-plugin-annotation`:

```js
annotation: {
  annotations: {
    line1: {
      type: "line",
      xMin: simulation.time,
      xMax: simulation.time,
      borderColor: "rgba(124, 124, 124, 0.6)",
      borderWidth: 6,
      borderDash: [8, 2],
    },
  },
},
```

In playback mode this line moves as `playbackTime` advances. In record mode it moves with the live `simulation.time`.

## Drag-to-scrub implementation

The outer `<div>` in `Charts.jsx` captures mouse events:

```jsx
<div
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
>
```

### Starting a drag

`handleMouseDown` sets `isDragging = true` only when:
- The event target is a `<canvas>` element (not a button or label)
- `data.selectedMode === 'playback'`
- There is recorded data

### Time calculation during drag

```js
const x = event.clientX - canvas.offsetLeft;
const timeValue = (x / canvas.offsetWidth) * getMaxTime();
const clampedTime = Math.max(0, Math.min(getMaxTime(), timeValue));
onSetPlaybackTime(clampedTime);
```

`canvas.offsetLeft` is the canvas's left edge relative to the offset parent. This is a simplified calculation — it works correctly when the chart panels are flush against the left edge of their container but can drift if there is significant nesting with transformed or positioned ancestors.

### Chart ref array

`chartRefs.current` is an array of Chart.js instance refs indexed by chart order:

```
chartRefs.current[0]  →  position chart
chartRefs.current[1]  →  velocity chart
chartRefs.current[2]  →  acceleration chart
```

`handleMouseMove` searches this array to find which canvas is under the cursor. Only the matching chart's canvas is used for the time calculation — all three charts produce the same x-axis range, so any of them would give the same result.

## Show/hide toggles

`isShow` state tracks which charts are visible:

```js
const [isShow, setIsShow] = useState({
  position: true,
  velocity: true,
  acceleration: true,
});
```

Each chart has an ✖ close button. When hidden, a restore button (❇️) appears as a text label. Hiding a chart removes it from the DOM entirely; the Chart.js instance is torn down and a new one is created on restore.
