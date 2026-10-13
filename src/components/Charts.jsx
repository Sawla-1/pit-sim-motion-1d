import { useState, useRef } from "react";
import { formatNumber } from "../utils/formatNumber";
import { useChartZoom } from "../hooks/useChartZoom";
import { ChartZoomControls, ChartPanel } from "./ChartControls";
import { SERIES_COLORS } from "../styles/seriesColors";

// Bigger, bolder axis numbers; smaller on phones and on short pages
// (same ≤600px-tall rule as the CSS), so all 3 charts always match
const tickFont = (ctx) => ({
  size: ctx.chart.width < 500 || window.innerHeight <= 600 ? 13 : 16,
  weight: 600,
});

// The 3 charts, top to bottom. `key` is the field name in the recorded data.
const CHARTS = [
  { key: "position", label: "Position" },
  { key: "velocity", label: "Velocity" },
  { key: "acceleration", label: "Acceleration" },
];

// Renders the Position/Velocity/Acceleration line charts, each with its own
// Y-axis zoom/pan and a shared X-axis (time) zoom/pan across all three.
// `inputs` = the 3 input panels (built in App), one shown beside each chart.
function Charts({ data, simulation, pins, onSeek, showScrubHint, inputs }) {
  // A ref, not state: the moves right after pointer-down must see it at once,
  // without waiting for React to re-render.
  const isDragging = useRef(false);
  const [visibility, setVisibility] = useState({
    position: true,
    velocity: true,
    acceleration: true,
  });
  const chartRefs = useRef([]);

  const {
    maxTime,
    xRange,
    getYWindow,
    fitWindow,
    handleXZoom,
    handleXPan,
    xZoomInDisabled,
    xZoomOutDisabled,
    xPanLeftDisabled,
    xPanRightDisabled,
    handleYZoom,
    handleYPan,
    getYDisabled,
    zoomToPins,
    handleReset,
    isResetDisabled,
  } = useChartZoom(data);
  const isPlayback = data.selectedMode === "playback";

  // Build chart data - simplified
  const buildChartData = (valueKey, color) => ({
    datasets: [
      {
        data: data.recordedData.map((state) => ({ x: state.time, y: state[valueKey] })),
        borderColor: color,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 10,
        tension: 0,
      },
    ],
  });

  // ---- Drag-to-scrub (playback mode) ----
  // Pointer events cover mouse, finger and pen with one set of handlers.

  const handlePointerDown = (event) => {
    // Only start dragging if pressing on a canvas and in playback mode
    if (
      event.target.tagName === "CANVAS" &&
      data.selectedMode === "playback"
    ) {
      isDragging.current = true;
      // Keep sending moves to this canvas even if the finger/mouse slides off it
      event.target.setPointerCapture(event.pointerId);
      event.preventDefault();
      // Jump to where the finger/mouse went down, not only once it moves
      seekToPointer(event);
    }
  };

  const handlePointerMove = (event) => {
    // isDragging can only be true in playback mode (see handlePointerDown)
    if (isDragging.current) seekToPointer(event);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // Seek to the time under the pointer on the chart it is on
  const seekToPointer = (event) => {
    const canvas = event.target;
    // chartRefs.current holds the 3 Chart.js chart objects
    // (position, velocity, acceleration). Each one has its own
    // .canvas and .scales, so we can match by canvas here.
    const chart = chartRefs.current.find(
      (items) => items && items.canvas === canvas
    );

    if (chart) {
      const x = event.clientX - canvas.getBoundingClientRect().left;
      const timeValue = chart.scales.x.getValueForPixel(x);
      const clampedTime = Math.max(0, Math.min(maxTime, timeValue));
      onSeek(clampedTime);
    }
  };

  // All charts share one time axis, so (like PhET) only the lowest visible
  // chart shows the time numbers and time zoom buttons. Before anything is
  // recorded there are no time numbers, so no chart gets the extra room (-1)
  // and all three are the same height.
  const hasRecording = data.recordedData.length > 1;
  const bottomIndex = hasRecording
    ? CHARTS.map(({ key }) => visibility[key]).lastIndexOf(true)
    : -1;

  // The top visible chart shows the scrub hint
  const topIndex = CHARTS.findIndex(({ key }) => visibility[key]);

  // Simplified chart options
  const getChartOptions = (index, valueKey) => {
    // Record mode always shows the default view (it grows with the data).
    const yWindow = isPlayback ? getYWindow(valueKey, index) : fitWindow(valueKey);

    // The pinned points (A and B): each gets a dot and an always-visible label
    // (the label goes to the side that has room, so it stays inside the plot)
    const GAP = 14; // clear space between the dot and its label
    const labelH = 28;
    const LETTER_W = 18; // room for the big letter between the dot and the tooltip
    const pinNotes = {};
    for (const pin of pins) {
      const text = `(${formatNumber(pin.time, 2)}, ${formatNumber(pin[valueKey], 2)})`;
      const labelW = text.length * 7 + 12; // rough width: about 7px per letter
      // Which side of the dot has room? The letter and the tooltip share one row:
      // dot, letter, tooltip. 1 = right / below, -1 = left / above
      // (72px kept clear for the hide button)
      const sides = (chart) => {
        const { chartArea } = chart;
        const dotX = chart.scales.x.getPixelForValue(pin.time);
        const dotY = chart.scales.y.getPixelForValue(pin[valueKey]);
        return {
          x: chartArea.right - 72 - dotX > labelW + LETTER_W + GAP ? 1 : -1,
          y: dotY - chartArea.top > labelH + GAP ? -1 : 1,
        };
      };
      pinNotes["dot" + pin.name] = {
        type: "point",
        xValue: pin.time,
        yValue: pin[valueKey],
        radius: 5,
        backgroundColor: "#fff",
        borderColor: "#1f2937",
        borderWidth: 2,
      };
      pinNotes["label" + pin.name] = {
        type: "label",
        xValue: pin.time,
        yValue: pin[valueKey],
        // Right of the dot if there is room, else left. Above if there is room, else below.
        xAdjust: ({ chart }) => sides(chart).x * (GAP + LETTER_W + labelW / 2),
        yAdjust: ({ chart }) => sides(chart).y * (GAP + labelH / 2),
        content: text,
        color: "#fff",
        backgroundColor: "#1f2937",
        borderRadius: 6,
        padding: 6,
      };
      // The big letter (A or B): same row as the tooltip, right after the dot
      pinNotes["letter" + pin.name] = {
        type: "label",
        xValue: pin.time,
        yValue: pin[valueKey],
        xAdjust: ({ chart }) => sides(chart).x * (GAP + LETTER_W / 2),
        yAdjust: ({ chart }) => sides(chart).y * (GAP + labelH / 2),
        content: pin.name,
        color: "#1f2937",
        backgroundColor: "transparent",
        font: { size: 16, weight: "bold" },
      };
    }

    return {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      parsing: false, // required by the decimation plugin, and our data is already {x, y}
      // Same right padding on every chart, so hiding the time numbers on the
      // upper charts doesn't make their plots wider than the bottom one.
      layout: { padding: { right: 16 } },
      scales: {
        x: {
          type: "linear",
          min: isPlayback ? xRange?.min ?? 0 : 0,
          max: isPlayback ? xRange?.max ?? maxTime : maxTime,
          ticks: { includeBounds: false, display: index === bottomIndex, color: "#1f2937", font: tickFont },
          grid: { color: "#e5e7eb" },
          border: { dash: [4, 4] }, // dashed grid lines (4px dash, 4px gap)
          // Fixed height for the time numbers, so the bottom plot doesn't grow
          // when there are no numbers yet (see ChartPanel's extra 18px).
          afterFit: (scale) => {
            if (index === bottomIndex) scale.height = 26;
          },
        },
        y: {
          type: "linear",
          min: yWindow.min, // always round (see useChartZoom)
          max: yWindow.max,
          ticks: {
            count: 5, // 5 fixed lines → 5 round, exact labels
            color: "#1f2937",
            font: tickFont,
            // Every line is a multiple of 0.1 (the smallest step), so 1 decimal
            // is always exact. It also hides float noise like 6.6000000000000005.
            callback: (value) => value.toLocaleString(undefined, { maximumFractionDigits: 1 }),
          },
          // The 0 line is dark and thicker (like PhET); the others are light grey.
          grid: {
            color: (ctx) => (ctx.tick.value === 0 ? "#1f2937" : "#e5e7eb"),
            lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1),
          },
          border: { dash: [4, 4] },
          // Fixed width so all three plots start at the same x pixel and
          // time 0 lines up vertically across charts. (The chart's name is
          // in its input panel now, so there's no sideways title here.)
          // Phones (chart under 500px) get a narrower axis so the plot has more room.
          afterFit: (scale) => {
            scale.width = scale.chart.width < 500 ? 56 : 70;
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: () => "",
            label: (ctx) =>
              `(${formatNumber(ctx.parsed.x, 2)}, ${formatNumber(ctx.parsed.y, 2)})`,
          },
        },
        decimation: {
          enabled: true,
          algorithm: "min-max", // preserves spikes/dips in the data instead of smoothing over them
        },
        annotation: {
          clip: true, // cut the "now" line off at the plot edge
          annotations: {
            line1: {
              type: "line",
              xMin: simulation.time,
              xMax: simulation.time,
              // "Now" marker: see-through so the data line stays visible behind it;
              // orange isn't used by any data line.
              borderColor: "rgba(245, 158, 11, 0.5)", // same orange, 50% see-through
              borderWidth: 8,
              // Dashed left and right edges on the see-through band
              afterDraw: ({ chart, element }) => {
                const { ctx, chartArea } = chart;
                ctx.save();
                ctx.strokeStyle = "#f59e0b";
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]); // 4px dash, 4px gap (same as the grid)
                for (const x of [element.x - 4, element.x + 4]) {
                  if (x < chartArea.left || x > chartArea.right) continue; // don't draw outside the plot
                  ctx.beginPath();
                  ctx.moveTo(x, chartArea.top);
                  ctx.lineTo(x, chartArea.bottom);
                  ctx.stroke();
                }
                ctx.restore();
              },
            },
            ...pinNotes,
          },
        },
      },
    };
  };

  // Identical across all three charts - the x-axis (time) is shared state,
  // not per-chart - so it's built once here instead of repeated 3x below.
  const xControls = (
    <ChartZoomControls
      axis="x"
      onZoomIn={() => handleXZoom(1.2)}
      onZoomOut={() => handleXZoom(0.8)}
      onPanPositive={() => handleXPan(-1)}
      onPanNegative={() => handleXPan(1)}
      zoomInDisabled={xZoomInDisabled}
      zoomOutDisabled={xZoomOutDisabled}
      panPositiveDisabled={xPanLeftDisabled}
      panNegativeDisabled={xPanRightDisabled}
    />
  );

  return (
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp} // browser took over (e.g. started scrolling)
        // Playback: a sideways finger drag scrubs, an up/down swipe still scrolls the page
        className={`flex flex-col gap-1 max-lg:[@media(max-height:600px)]:gap-0.5 lg:gap-0 flex-1 min-h-0 min-w-0 text-gray-700 ${
          isPlayback ? "touch-pan-y" : ""
        }`}
      >
        {CHARTS.map(({ key, label }, index) => {
          const yDisabled = getYDisabled(key, index);
          const isBottom = index === bottomIndex;
          return (
            <ChartPanel
              key={key}
              label={label}
              visible={visibility[key]}
              onShow={() => setVisibility({ ...visibility, [key]: true })}
              onHide={() => setVisibility({ ...visibility, [key]: false })}
              yControlsProps={{
                onZoomIn: () => handleYZoom(key, index, 1.2),
                onZoomOut: () => handleYZoom(key, index, 0.8),
                onPanPositive: () => handleYPan(index, 1),
                onPanNegative: () => handleYPan(index, -1),
                zoomInDisabled: yDisabled.zoomInDisabled,
                zoomOutDisabled: yDisabled.zoomOutDisabled,
                panPositiveDisabled: yDisabled.panUpDisabled,
                panNegativeDisabled: yDisabled.panDownDisabled,
              }}
              showZoomControls={isPlayback}
              xControls={xControls}
              isBottom={isBottom}
              scrubHint={showScrubHint && index === topIndex}
              onReset={() => handleReset(index, isBottom)}
              resetDisabled={isResetDisabled(index, isBottom)}
              onZoomToPins={() => zoomToPins(pins, CHARTS.map((c) => c.key))}
              zoomToPinsDisabled={pins.length < 2}
              input={inputs[index]}
              chartData={buildChartData(key, SERIES_COLORS[key].color)}
              chartOptions={getChartOptions(index, key)}
              chartRef={(ref) => {
                if (ref) chartRefs.current[index] = ref;
              }}
            />
          );
        })}
      </div>
  );
}

export default Charts;
