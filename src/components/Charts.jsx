import { useState, useRef } from "react";
import { formatNumber } from "../utils/formatNumber";
import { useChartZoom } from "../hooks/useChartZoom";
import { ChartZoomControls, ChartPanel } from "./ChartControls";

// Renders the Position/Velocity/Acceleration line charts, each with its own
// Y-axis zoom/pan and a shared X-axis (time) zoom/pan across all three.
function Charts({ data, simulation, onSeek }) {
  // A ref, not state: the moves right after pointer-down must see it at once,
  // without waiting for React to re-render.
  const isDragging = useRef(false);
  const [visibility, setVisibility] = useState({
    showPosition: true,
    showVelocity: true,
    showAcceleration: true,
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

  const positionYDisabled = getYDisabled("position", 0);
  const velocityYDisabled = getYDisabled("velocity", 1);
  const accelerationYDisabled = getYDisabled("acceleration", 2);

  // All charts share one time axis, so (like PhET) only the lowest visible
  // chart shows the time numbers and time zoom buttons.
  const bottomIndex = [
    visibility.showPosition,
    visibility.showVelocity,
    visibility.showAcceleration,
  ].lastIndexOf(true);

  // Simplified chart options
  const getChartOptions = (index, valueKey, title, color) => {
    // Record mode always shows the default view (it grows with the data).
    const yWindow = isPlayback ? getYWindow(valueKey, index) : fitWindow(valueKey);
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
          ticks: { includeBounds: false, display: index === bottomIndex },
          grid: { color: "#ccc" },
          border: { dash: [4, 4] }, // dashed grid lines (4px dash, 4px gap)
        },
        y: {
          type: "linear",
          min: yWindow.min, // always round (see useChartZoom)
          max: yWindow.max,
          ticks: {
            count: 5, // 5 fixed lines → 5 round, exact labels
            // Smaller numbers on phones so they fit the narrower axis (see afterFit)
            font: (ctx) => ({ size: ctx.chart.width < 500 ? 10 : 12 }),
            // Every line is a multiple of 0.1 (the smallest step), so 1 decimal
            // is always exact. It also hides float noise like 6.6000000000000005.
            callback: (value) => value.toLocaleString(undefined, { maximumFractionDigits: 1 }),
          },
          // The 0 line is dark and thicker (like PhET); the others are light grey.
          grid: {
            color: (ctx) => (ctx.tick.value === 0 ? "#000" : "#ccc"),
            lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1),
          },
          border: { dash: [4, 4] },
          // The chart's name, written sideways along the y-axis.
          title: { display: true, text: title, color, font: { weight: "bold" } },
          // Fixed width so all three plots start at the same x pixel and
          // time 0 lines up vertically across charts. Wide enough for the
          // title plus labels like "-10,499.8" or "-500,000" without clipping.
          // Phones (chart under 500px) get a narrower axis so the plot has more
          // room - still fits labels up to "-100,000" at the 10px phone font.
          afterFit: (scale) => {
            scale.width = scale.chart.width < 500 ? 70 : 84;
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
              // "Now" marker: solid so it doesn't blend with the dashed grid;
              // orange isn't used by any data line.
              borderColor: "#f59e0b",
              borderWidth: 4,
            },
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
        className={`flex flex-col gap-1 flex-3 min-w-0 text-white text-right ${
          isPlayback ? "touch-pan-y" : ""
        }`}
      >
        <ChartPanel
          label="Position"
          visible={visibility.showPosition}
          onShow={() => setVisibility({ ...visibility, showPosition: true })}
          onHide={() => setVisibility({ ...visibility, showPosition: false })}
          yControlsProps={{
            onZoomIn: () => handleYZoom("position", 0, 1.2),
            onZoomOut: () => handleYZoom("position", 0, 0.8),
            onPanPositive: () => handleYPan(0, 1),
            onPanNegative: () => handleYPan(0, -1),
            zoomInDisabled: positionYDisabled.zoomInDisabled,
            zoomOutDisabled: positionYDisabled.zoomOutDisabled,
            panPositiveDisabled: positionYDisabled.panUpDisabled,
            panNegativeDisabled: positionYDisabled.panDownDisabled,
          }}
          showZoomControls={isPlayback}
          xControls={xControls}
          isBottom={bottomIndex === 0}
          onReset={() => handleReset(0)}
          resetDisabled={isResetDisabled(0)}
          chartData={buildChartData("position", "#1976d2")}
          chartOptions={getChartOptions(0, "position", "Position (m)", "#1976d2")}
          chartRef={(ref) => {
            if (ref) chartRefs.current[0] = ref;
          }}
        />
        <ChartPanel
          label="Velocity"
          visible={visibility.showVelocity}
          onShow={() => setVisibility({ ...visibility, showVelocity: true })}
          onHide={() => setVisibility({ ...visibility, showVelocity: false })}
          yControlsProps={{
            onZoomIn: () => handleYZoom("velocity", 1, 1.2),
            onZoomOut: () => handleYZoom("velocity", 1, 0.8),
            onPanPositive: () => handleYPan(1, 1),
            onPanNegative: () => handleYPan(1, -1),
            zoomInDisabled: velocityYDisabled.zoomInDisabled,
            zoomOutDisabled: velocityYDisabled.zoomOutDisabled,
            panPositiveDisabled: velocityYDisabled.panUpDisabled,
            panNegativeDisabled: velocityYDisabled.panDownDisabled,
          }}
          showZoomControls={isPlayback}
          xControls={xControls}
          isBottom={bottomIndex === 1}
          onReset={() => handleReset(1)}
          resetDisabled={isResetDisabled(1)}
          chartData={buildChartData("velocity", "#d32f2f")}
          chartOptions={getChartOptions(1, "velocity", "Velocity (m/s)", "#d32f2f")}
          chartRef={(ref) => {
            if (ref) chartRefs.current[1] = ref;
          }}
        />
        <ChartPanel
          label="Acceleration"
          visible={visibility.showAcceleration}
          onShow={() => setVisibility({ ...visibility, showAcceleration: true })}
          onHide={() => setVisibility({ ...visibility, showAcceleration: false })}
          yControlsProps={{
            onZoomIn: () => handleYZoom("acceleration", 2, 1.2),
            onZoomOut: () => handleYZoom("acceleration", 2, 0.8),
            onPanPositive: () => handleYPan(2, 1),
            onPanNegative: () => handleYPan(2, -1),
            zoomInDisabled: accelerationYDisabled.zoomInDisabled,
            zoomOutDisabled: accelerationYDisabled.zoomOutDisabled,
            panPositiveDisabled: accelerationYDisabled.panUpDisabled,
            panNegativeDisabled: accelerationYDisabled.panDownDisabled,
          }}
          showZoomControls={isPlayback}
          xControls={xControls}
          isBottom={bottomIndex === 2}
          onReset={() => handleReset(2)}
          resetDisabled={isResetDisabled(2)}
          chartData={buildChartData("acceleration", "#2e7d32")}
          chartOptions={getChartOptions(2, "acceleration", "Acceleration (m/s²)", "#2e7d32")}
          chartRef={(ref) => {
            if (ref) chartRefs.current[2] = ref;
          }}
        />
      </div>
  );
}

export default Charts;
