# Lesson 10: Chart.js Basics

**Placement note:** Chart.js is taught late because it is a third-party library, not a React or physics concept. You need to understand React props (Lessons 1–3) first, since the charts in this project receive data as props and re-render when those props change.

---

## What Is Chart.js?

Chart.js is a JavaScript library for rendering data-driven charts on an HTML `<canvas>` element. It handles all the drawing work: axes, labels, grid lines, lines connecting your data points, tooltips, colors. You provide the data and configuration; Chart.js handles the pixels.

In this project, Chart.js draws the three graphs: position vs. time, velocity vs. time, and acceleration vs. time. These are line charts where the x-axis is time (in seconds) and the y-axis is the respective physics value.

---

## How Chart.js Works in React

You could use the raw Chart.js API directly, but in React it is more convenient to use the `react-chartjs-2` wrapper library. This wrapper provides React components like `<Line />`, `<Bar />`, and `<Scatter />` that accept `data` and `options` as props and manage the Chart.js lifecycle internally. When the props change (because new data was recorded), `react-chartjs-2` re-renders the chart automatically.

Before using any Chart.js component, you must register the components you need. Chart.js uses a modular architecture — you import and register only what you use:

```js
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip);
```

Then you use the `<Line />` component:

```jsx
import { Line } from "react-chartjs-2";

function MyChart({ points }) {
  const data = {
    datasets: [{
      label: "My Data",
      data: points.map(p => ({ x: p.time, y: p.value })),
      borderColor: "blue",
      pointRadius: 0,
      tension: 0,
    }],
  };

  const options = {
    responsive: true,
    scales: {
      x: { type: "linear" },
      y: { type: "linear" },
    },
  };

  return <Line data={data} options={options} />;
}
```

---

## The `data` Structure

The `data` prop is an object with a `datasets` array. Each dataset is one line on the chart:

```js
{
  datasets: [
    {
      label: "Position",          // Shown in the legend (if enabled)
      data: [                      // Array of {x, y} points
        { x: 0, y: 0 },
        { x: 0.042, y: 0.021 },
        { x: 0.083, y: 0.083 },
        // ...
      ],
      borderColor: "#1976d2",      // Line color
      pointRadius: 0,              // No dots on data points
      tension: 0,                  // Straight lines between points (no curves)
    }
  ]
}
```

For x/y scatter-style data (where each point has explicit x and y values rather than an implied x index), Chart.js uses the `{ x, y }` object format inside the `data` array, and the scale type must be `"linear"` for both axes.

---

## The `options` Structure

The `options` prop controls the chart's behavior and appearance:

```js
{
  responsive: true,          // Resize with the container
  animation: false,          // No animation on update (important for performance)
  maintainAspectRatio: false, // Let the container CSS control the height
  scales: {
    x: {
      type: "linear",
      min: 0,
      max: maxTime,          // Match the recording's time range
    },
    y: {
      type: "linear",
    },
  },
  plugins: {
    legend: { display: false },    // Hide the legend
    tooltip: {
      enabled: true,
      callbacks: {
        label: (ctx) => `(${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`,
      },
    },
  },
}
```

`animation: false` is important for this project. Without it, Chart.js animates every update — every physics step would trigger a 300ms animation of the line growing. With physics running at 24 Hz, this would be visual chaos. Disabling animation makes updates instant.

---

## In This Project

`Charts.jsx` builds three `<Line />` charts. A helper function builds the data object for each:

```js
const buildChartData = (valueKey, color) => ({
  datasets: [{
    data: data.recordedData.map((state) => ({ x: state.time, y: state[valueKey] })),
    borderColor: color,
    pointRadius: 0,
    tension: 0,
  }],
});
```

This is called three times: `buildChartData("position", "#1976d2")`, `buildChartData("velocity", "#d32f2f")`, `buildChartData("acceleration", "#2e7d32")`. The `valueKey` string is used to pluck the right physics value from each recorded snapshot.

When `data.recordedData` grows (because the physics loop appended a new snapshot), App's state changes, which re-renders `Charts`, which passes new `data` props to the `<Line />` components, which re-render the charts with the new data. The chart update is driven entirely by React's normal prop flow — no imperative "update the chart" calls needed.

`react-chartjs-2` also accepts a `ref` prop for accessing the underlying Chart.js instance. `Charts.jsx` uses this:

```js
ref={(ref) => {
  if (ref) chartRefs.current[0] = ref;
}}
```

The `chartRefs` array stores references to all three chart instances. These are used during timeline scrubbing: when the user drags on a chart canvas, the code needs to convert a pixel x-position to a time value. It does this by calling `chart.scales.x.getValueForPixel(x)` on the underlying Chart.js instance — an imperative API call that the declarative props system cannot handle.

---

## What You Do NOT Need to Know

You do not need to understand the raw Chart.js imperative API, the canvas lifecycle, plugin registration details beyond what is already in `Charts.jsx`, or most of the configuration options. The `react-chartjs-2` wrapper handles the imperative Chart.js setup. You only need to understand the `data` and `options` structures well enough to read what `Charts.jsx` is building, and to understand that the charts update automatically when props change.

If you want to change what is displayed in the charts, the right place to look is `buildChartData` (to change what data is plotted) and `getChartOptions` (to change axis ranges, colors, or tooltip formatting). Everything else in Chart.js is already handled.
