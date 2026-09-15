import { useState, useRef, useEffect } from "react";
import { formatNumber } from "../utils/formatNumber";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Decimation,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";

// Register Chart.js plugins
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Decimation,
  annotationPlugin,
  zoomPlugin
);

// Single chevron button, rotated per direction, used for the pan controls.
function PanButton({ direction, onClick, label }) {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer hover:text-gray-600"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <polyline points="6 15 12 9 18 15" />
      </svg>
    </button>
  );
}

// Reset-zoom button - small counterclockwise-arrow icon, same visual
// language as the other chart controls.
function ResetButton({ onClick }) {
  return (
    <button
      type="button"
      aria-label="Reset zoom"
      onClick={onClick}
      className="absolute bottom-2 right-2 cursor-pointer text-gray-400 hover:text-gray-600"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <polyline points="3 3 3 8 8 8" />
      </svg>
    </button>
  );
}

// Zoom + pan toolbar: zoom in / pan buttons / zoom out.
// axis="y" lays out vertically along the right edge (pan up/down between the
// zoom buttons); axis="x" lays out horizontally along the bottom edge (pan
// left/right between the zoom buttons).
function ChartZoomControls({ axis, onZoomIn, onZoomOut, onPanPositive, onPanNegative }) {
  const containerClass =
    axis === "x"
      ? "absolute bottom-2 right-20 flex flex-row items-center gap-1 text-gray-400"
      : "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-gray-400";

  const zoomInButton = (
    <button
      key="in"
      type="button"
      aria-label="Zoom in"
      onClick={onZoomIn}
      className="cursor-pointer hover:text-gray-600"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    </button>
  );

  const zoomOutButton = (
    <button
      key="out"
      type="button"
      aria-label="Zoom out"
      onClick={onZoomOut}
      className="cursor-pointer hover:text-gray-600"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    </button>
  );

  const panPositiveButton = (
    <PanButton
      key="pan-pos"
      direction={axis === "x" ? "left" : "up"}
      onClick={onPanPositive}
      label={axis === "x" ? "Pan left" : "Pan up"}
    />
  );

  const panNegativeButton = (
    <PanButton
      key="pan-neg"
      direction={axis === "x" ? "right" : "down"}
      onClick={onPanNegative}
      label={axis === "x" ? "Pan right" : "Pan down"}
    />
  );

  return (
    <div className={containerClass}>
      {axis === "x"
        ? [zoomOutButton, panPositiveButton, panNegativeButton, zoomInButton]
        : [zoomInButton, panPositiveButton, panNegativeButton, zoomOutButton]}
    </div>
  );
}

/**
 * Charts Component - Simplified graphs with all functionality
 * Combines all chart logic into one simple component
 */
const MIN_ZOOM_WINDOW = 1; // seconds - smallest visible x-axis window when zoomed in

function Charts({ data, simulation, onSeek }) {
  // State for drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useState({
    showPosition: true,
    showVelocity: true,
    showAcceleration: true,
  });
  // Shared x-axis (time) zoom window across all three charts. null = full/auto range.
  const [xRange, setXRange] = useState(null);
  const chartRefs = useRef([]);

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

  const maxTime = data.recordedData.length > 0
    ? data.recordedData[data.recordedData.length - 1].time
    : 0;

  // Clearing/resetting the recording drops maxTime back to 0 - drop any
  // stale zoom window from before the clear along with it.
  useEffect(() => {
    if (maxTime === 0 && xRange !== null) setXRange(null);
  }, [maxTime, xRange]);

  // Drag handlers for timeline scrubbing
  const handleMouseDown = (event) => {
    // Only start dragging if clicking on a canvas and in playback mode
    if (
      event.target.tagName === "CANVAS" &&
      data.selectedMode === "playback" &&
      data.recordedData.length > 0
    ) {
      setIsDragging(true);
      event.preventDefault();
    }
  };

  const handleMouseMove = (event) => {
    if (
      isDragging &&
      data.selectedMode === "playback" &&
      data.recordedData.length > 0
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

  const handleZoom = (index, factor) => {
    const chart = chartRefs.current[index];
    if (!chart || maxTime === 0) return;
    chart.zoom({ y: factor });
  };

  // Shared across all charts, since they all share the same time axis.
  const handleXZoom = (factor) => {
    if (maxTime === 0) return;
    if (factor > 1 && maxTime < MIN_ZOOM_WINDOW) return; // not enough data to zoom in

    const currentMax = xRange?.max ?? maxTime;
    const requestedMax = currentMax / factor;
    const newMax = factor > 1
      ? Math.max(MIN_ZOOM_WINDOW, requestedMax) // zoom in: never shrink below MIN_ZOOM_WINDOW
      : Math.min(maxTime, requestedMax);         // zoom out: never exceed full data

    setXRange({ min: 0, max: newMax });
  };

  // Y-axis pan uses the native Chart.js pan (each chart keeps its own y
  // scale/limits), so it can just nudge that chart's own scale directly.
  const Y_PAN_PIXELS = 30;
  const handleYPan = (index, direction) => {
    const chart = chartRefs.current[index];
    if (!chart || maxTime === 0) return;
    chart.pan({ y: direction * Y_PAN_PIXELS });
  };

  // X-axis (time) is shared React state across all three charts - not a
  // native Chart.js scale - so panning moves the xRange window instead,
  // the same way handleXZoom resizes it. Clamped to [0, maxTime].
  const handleXPan = (direction) => {
    if (maxTime === 0) return;
    const currentMin = xRange?.min ?? 0;
    const currentMax = xRange?.max ?? maxTime;
    const windowWidth = currentMax - currentMin;
    if (windowWidth >= maxTime) return; // fully zoomed out - nothing to pan

    const step = windowWidth * 0.2 * direction;
    let newMin = currentMin + step;
    let newMax = currentMax + step;

    if (newMin < 0) {
      newMax -= newMin;
      newMin = 0;
    } else if (newMax > maxTime) {
      newMin -= newMax - maxTime;
      newMax = maxTime;
    }

    setXRange({ min: newMin, max: newMax });
  };

  // Resets this chart's y-axis zoom/pan, and the shared x-axis window
  // (which resets it for all three charts, same as x-zoom/pan already do).
  const handleReset = (index) => {
    const chart = chartRefs.current[index];
    if (chart) chart.resetZoom();
    setXRange(null);
  };

  // Simplified chart options
  const getChartOptions = (valueKey) => {
    const values = data.recordedData.map((state) => state[valueKey]);
    const yMin = values.length > 0 ? values.reduce((a, b) => Math.min(a, b)) : -1;
    const yMax = values.length > 0 ? values.reduce((a, b) => Math.max(a, b)) : 1;

    return {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      parsing: false, // required by the decimation plugin, and our data is already {x, y}
      scales: {
        x: {
          type: "linear",
          min: xRange?.min ?? 0,
          max: xRange?.max ?? maxTime,
        },
        y: {
          type: "linear",
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
        zoom: {
          limits: {
            y: { min: yMin, max: yMax },
          },
          zoom: { mode: "y" },
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

  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex flex-col gap-1 flex-3 min-w-0 text-white text-right"
      >
        {/* Position Button */}
        {!visibility.showPosition && (
          <div>
            Position Graph{" "}
            <button
              className="cursor-pointer"
              onClick={() => setVisibility({ ...visibility, showPosition: true })}
            >
              ❇️
            </button>{" "}
          </div>
        )}
        {/* Position Graph */}
        {visibility.showPosition && (
          <div className="relative flex-auto bg-gray-100 h-[170px] pt-8 pb-6 px-8 rounded-md">
            <span className="absolute top-2 left-8 text-sm text-blue-600 font-semibold">
              Position
            </span>
            <span className="absolute top-2 right-10 text-sm text-blue-600 font-semibold">
              {formatNumber(simulation.position, 2)} m
            </span>
            <button
              className="absolute top-2 right-2 text-xs text-white font-semibold cursor-pointer bg-red-600 px-1 py-0.5 rounded-sm"
              onClick={() => setVisibility({ ...visibility, showPosition: false })}
            >
              ✖
            </button>
            <ChartZoomControls
              axis="y"
              onZoomIn={() => handleZoom(0, 1.2)}
              onZoomOut={() => handleZoom(0, 0.8)}
              onPanPositive={() => handleYPan(0, 1)}
              onPanNegative={() => handleYPan(0, -1)}
            />
            <ChartZoomControls
              axis="x"
              onZoomIn={() => handleXZoom(1.2)}
              onZoomOut={() => handleXZoom(0.8)}
              onPanPositive={() => handleXPan(-1)}
              onPanNegative={() => handleXPan(1)}
            />
            <ResetButton onClick={() => handleReset(0)} />
            <Line
              data={buildChartData("position", "#1976d2")}
              options={getChartOptions("position")}
              ref={(ref) => {
                if (ref) chartRefs.current[0] = ref;
              }}
            />
          </div>
        )}
        {/* Velocity Button */}
        {!visibility.showVelocity && (
          <div>
            Velocity Graph{" "}
            <button
              className="cursor-pointer"
              onClick={() => setVisibility({ ...visibility, showVelocity: true })}
            >
              ❇️
            </button>{" "}
          </div>
        )}

        {/* Velocity Graph */}
        {visibility.showVelocity && (
          <div className="relative flex-auto bg-gray-100 h-[170px] pt-8 pb-6 px-8 rounded-md">
            <span className="absolute top-2 left-8 text-sm text-red-600 font-semibold">
              Velocity
            </span>
            <span className="absolute top-2 right-10 text-sm text-red-600 font-semibold">
              {formatNumber(simulation.velocity, 2)} m/s
            </span>
            <button
              className="absolute top-2 right-2 text-xs text-white font-semibold cursor-pointer bg-red-600 px-1 py-0.5 rounded-sm"
              onClick={() => setVisibility({ ...visibility, showVelocity: false })}
            >
              ✖
            </button>
            <ChartZoomControls
              axis="y"
              onZoomIn={() => handleZoom(1, 1.2)}
              onZoomOut={() => handleZoom(1, 0.8)}
              onPanPositive={() => handleYPan(1, 1)}
              onPanNegative={() => handleYPan(1, -1)}
            />
            <ChartZoomControls
              axis="x"
              onZoomIn={() => handleXZoom(1.2)}
              onZoomOut={() => handleXZoom(0.8)}
              onPanPositive={() => handleXPan(-1)}
              onPanNegative={() => handleXPan(1)}
            />
            <ResetButton onClick={() => handleReset(1)} />
            <Line
              data={buildChartData("velocity", "#d32f2f")}
              options={getChartOptions("velocity")}
              ref={(ref) => {
                if (ref) chartRefs.current[1] = ref;
              }}
            />
          </div>
        )}
        {/* Acceleration Button */}
        {!visibility.showAcceleration && (
          <div>
            Acceleration Graph{" "}
            <button
              className="cursor-pointer"
              onClick={() => setVisibility({ ...visibility, showAcceleration: true })}
            >
              ❇️
            </button>{" "}
          </div>
        )}

        {/* Acceleration Graph */}
        {visibility.showAcceleration && (
          <div className="relative flex-auto bg-gray-100 h-[170px] pt-8 pb-6 px-8 rounded-md">
            <span className="absolute top-2 left-8 text-sm text-green-600 font-semibold">
              Acceleration
            </span>
            <span className="absolute top-2 right-10 text-sm text-green-600 font-semibold">
              {formatNumber(simulation.acceleration, 2)} m/s²
            </span>
            <button
              className="absolute top-2 right-2 text-xs text-white font-semibold cursor-pointer bg-red-600 px-1 py-0.5 rounded-sm"
              onClick={() => setVisibility({ ...visibility, showAcceleration: false })}
            >
              ✖
            </button>
            <ChartZoomControls
              axis="y"
              onZoomIn={() => handleZoom(2, 1.2)}
              onZoomOut={() => handleZoom(2, 0.8)}
              onPanPositive={() => handleYPan(2, 1)}
              onPanNegative={() => handleYPan(2, -1)}
            />
            <ChartZoomControls
              axis="x"
              onZoomIn={() => handleXZoom(1.2)}
              onZoomOut={() => handleXZoom(0.8)}
              onPanPositive={() => handleXPan(-1)}
              onPanNegative={() => handleXPan(1)}
            />
            <ResetButton onClick={() => handleReset(2)} />
            <Line
              data={buildChartData("acceleration", "#2e7d32")}
              options={getChartOptions("acceleration")}
              ref={(ref) => {
                if (ref) chartRefs.current[2] = ref;
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default Charts;
