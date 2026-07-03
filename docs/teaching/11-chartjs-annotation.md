# Lesson 11: Chart.js Annotation Plugin

**Placement note:** This lesson follows Chart.js basics (Lesson 10) directly — the annotation plugin is an add-on to Chart.js and makes no sense without understanding the base library first.

---

## What Is the Annotation Plugin?

Chart.js by itself draws lines connecting your data points and fills in axes and labels. But sometimes you need to draw additional things ON TOP of a chart that are not part of the data — a vertical line marking the current time, a horizontal threshold, a shaded region highlighting a range. That is what the annotation plugin does.

The annotation plugin (`chartjs-plugin-annotation`) is a separate package that adds a `annotations` configuration to the chart options. You describe shapes to draw, and the plugin draws them on top of the chart after the data is rendered.

---

## Registering the Plugin

Before using it, you register it with Chart.js:

```js
import annotationPlugin from "chartjs-plugin-annotation";
import { Chart as ChartJS } from "chart.js";

ChartJS.register(annotationPlugin);
```

This must run once, before any chart is rendered. In `Charts.jsx` this happens at the module level, alongside the other `ChartJS.register(...)` calls.

---

## The Annotation Object

Annotations are declared inside the `plugins.annotation.annotations` section of the chart options object. Each annotation has a name (used as the object key) and a configuration describing what to draw:

```js
plugins: {
  annotation: {
    annotations: {
      myLine: {
        type: "line",
        xMin: 2.5,      // Draw at x = 2.5 (time = 2.5 seconds)
        xMax: 2.5,      // Same as xMin for a vertical line
        borderColor: "red",
        borderWidth: 2,
      }
    }
  }
}
```

`type: "line"` with `xMin === xMax` draws a vertical line spanning the full height of the chart at the given x-axis value. If `yMin` and `yMax` were specified instead, you would get a horizontal line.

Other annotation types include `"box"` (a filled rectangle) and `"label"` (text). But for this project, a vertical line is all you need.

---

## In This Project

`Charts.jsx` uses the annotation plugin to draw a time cursor — a gray dashed vertical line that shows the current simulation time on all three charts simultaneously. Here is the relevant section of `getChartOptions`:

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

`simulation.time` is the current simulation time, passed as a prop from App. During playback and recording, as `simulation.time` updates, this value flows down as a prop to `Charts`, the `getChartOptions` function recalculates with the new time, and `react-chartjs-2` re-renders the chart with the cursor at the new position. The annotation moves in sync with the simulation time.

`borderDash: [8, 2]` makes the line dashed: 8 pixels on, 2 pixels off. This is a visual convention — a dashed line suggests a cursor or marker rather than data.

`borderColor: "rgba(124, 124, 124, 0.6)"` is a semi-transparent gray. It is visible but does not obscure the data lines underneath.

---

## That Is All You Need

You now know everything required to read and understand the annotation code in `Charts.jsx`. The plugin is registered once, configured in the options object, and driven by props. If you wanted to change the cursor color, width, or dash pattern, you would edit the annotation object in `getChartOptions`. If you wanted to add a second annotation (for example, to mark the start of a recorded segment), you would add a second key to the `annotations` object alongside `line1`.

No other annotation features are used in this project.
