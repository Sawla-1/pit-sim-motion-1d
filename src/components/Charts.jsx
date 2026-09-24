import { useState, useRef } from "react";
import { formatNumber } from "../utils/formatNumber";
import { useChartZoom } from "../hooks/useChartZoom";
import { ChartZoomControls, ChartPanel } from "./ChartControls";

// Renders the Position/Velocity/Acceleration line charts, each with its own
// Y-axis zoom/pan and a shared X-axis (time) zoom/pan across all three.
function Charts({ data, simulation, onSeek }) {
  // State for drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useState({
    showPosition: true,
    showVelocity: true,
    showAcceleration: true,
  });
  const chartRefs = useRef([]);

  const {
    maxTime,
    xRange,
    yRanges,
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

  const handleMouseDown = (event) => {
    // Only start dragging if clicking on a canvas and in playback mode
    if (
      event.target.tagName === "CANVAS" &&
      data.selectedMode === "playback"
    ) {
      setIsDragging(true);
      event.preventDefault();
    }
  };

  const handleMouseMove = (event) => {
    if (
      isDragging &&
      data.selectedMode === "playback"
    ) {
      // Find the chart that was clicked
      const canvas = event.target;
      const chart = chartRefs.current.find(
        (items) => items && items.canvas === canvas
      );
      // example data inside chartRefs.current
      // chartRefs.current = [
      //   { canvas: positionChartCanvas, chart: positionChart },
      //   { canvas: velocityChartCanvas, chart: velocityChart },
      //   { canvas: accelerationChartCanvas, chart: accelerationChart }
      // ]

      if (chart) {
        const x = event.clientX - canvas.getBoundingClientRect().left;
        const timeValue = chart.scales.x.getValueForPixel(x);
        const clampedTime = Math.max(0, Math.min(maxTime, timeValue));
        onSeek(clampedTime);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const positionYDisabled = getYDisabled("position", 0);
  const velocityYDisabled = getYDisabled("velocity", 1);
  const accelerationYDisabled = getYDisabled("acceleration", 2);

  // Simplified chart options
  const getChartOptions = (index) => {
    return {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      parsing: false, // required by the decimation plugin, and our data is already {x, y}
      scales: {
        x: {
          type: "linear",
          min: isPlayback ? xRange?.min ?? 0 : 0,
          max: isPlayback ? xRange?.max ?? maxTime : maxTime,
          ticks: { includeBounds: false },
        },
        y: {
          type: "linear",
          // undefined when never zoomed - Chart.js autoscales normally in
          // that case. Once zoomed, this pins the range so it survives
          // re-renders instead of being recalculated from the full dataset.
          min: isPlayback ? yRanges[index]?.min : undefined,
          max: isPlayback ? yRanges[index]?.max : undefined,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          intersect: true,
          mode: "index",
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
    <>
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex flex-col gap-1 flex-3 min-w-0 text-white text-right"
      >
        <ChartPanel
          label="Position"
          unit="m"
          textClass="text-blue-600"
          value={simulation.position}
          visible={visibility.showPosition}
          onShow={() => setVisibility({ ...visibility, showPosition: true })}
          onHide={() => setVisibility({ ...visibility, showPosition: false })}
          yControlsProps={{
            onZoomIn: () => handleYZoom("position", 0, 1.2),
            onZoomOut: () => handleYZoom("position", 0, 0.8),
            onPanPositive: () => handleYPan("position", 0, 1),
            onPanNegative: () => handleYPan("position", 0, -1),
            zoomInDisabled: positionYDisabled.zoomInDisabled,
            zoomOutDisabled: positionYDisabled.zoomOutDisabled,
            panPositiveDisabled: positionYDisabled.panUpDisabled,
            panNegativeDisabled: positionYDisabled.panDownDisabled,
          }}
          showZoomControls={isPlayback}
          xControls={xControls}
          onReset={() => handleReset(0)}
          resetDisabled={isResetDisabled(0)}
          chartData={buildChartData("position", "#1976d2")}
          chartOptions={getChartOptions(0)}
          chartRef={(ref) => {
            if (ref) chartRefs.current[0] = ref;
          }}
        />
        <ChartPanel
          label="Velocity"
          unit="m/s"
          textClass="text-red-600"
          value={simulation.velocity}
          visible={visibility.showVelocity}
          onShow={() => setVisibility({ ...visibility, showVelocity: true })}
          onHide={() => setVisibility({ ...visibility, showVelocity: false })}
          yControlsProps={{
            onZoomIn: () => handleYZoom("velocity", 1, 1.2),
            onZoomOut: () => handleYZoom("velocity", 1, 0.8),
            onPanPositive: () => handleYPan("velocity", 1, 1),
            onPanNegative: () => handleYPan("velocity", 1, -1),
            zoomInDisabled: velocityYDisabled.zoomInDisabled,
            zoomOutDisabled: velocityYDisabled.zoomOutDisabled,
            panPositiveDisabled: velocityYDisabled.panUpDisabled,
            panNegativeDisabled: velocityYDisabled.panDownDisabled,
          }}
          showZoomControls={isPlayback}
          xControls={xControls}
          onReset={() => handleReset(1)}
          resetDisabled={isResetDisabled(1)}
          chartData={buildChartData("velocity", "#d32f2f")}
          chartOptions={getChartOptions(1)}
          chartRef={(ref) => {
            if (ref) chartRefs.current[1] = ref;
          }}
        />
        <ChartPanel
          label="Acceleration"
          unit="m/s²"
          textClass="text-green-600"
          value={simulation.acceleration}
          visible={visibility.showAcceleration}
          onShow={() => setVisibility({ ...visibility, showAcceleration: true })}
          onHide={() => setVisibility({ ...visibility, showAcceleration: false })}
          yControlsProps={{
            onZoomIn: () => handleYZoom("acceleration", 2, 1.2),
            onZoomOut: () => handleYZoom("acceleration", 2, 0.8),
            onPanPositive: () => handleYPan("acceleration", 2, 1),
            onPanNegative: () => handleYPan("acceleration", 2, -1),
            zoomInDisabled: accelerationYDisabled.zoomInDisabled,
            zoomOutDisabled: accelerationYDisabled.zoomOutDisabled,
            panPositiveDisabled: accelerationYDisabled.panUpDisabled,
            panNegativeDisabled: accelerationYDisabled.panDownDisabled,
          }}
          showZoomControls={isPlayback}
          xControls={xControls}
          onReset={() => handleReset(2)}
          resetDisabled={isResetDisabled(2)}
          chartData={buildChartData("acceleration", "#2e7d32")}
          chartOptions={getChartOptions(2)}
          chartRef={(ref) => {
            if (ref) chartRefs.current[2] = ref;
          }}
        />
      </div>
    </>
  );
}

export default Charts;
