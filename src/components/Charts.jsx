import { useState, useRef } from "react";
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

// Zoom toolbar: zoom in / decorative move icon / zoom out.
// axis="y" lays out vertically along the right edge; axis="x" lays out
// horizontally along the bottom edge, with the decorative arrow rotated to match.
function ChartZoomControls({ axis, onZoomIn, onZoomOut }) {
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

  const decorativeIcon = (
    <span key="move" aria-hidden="true">
      {axis === "x" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="8 7 3 12 8 17" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <polyline points="16 7 21 12 16 17" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7 8 12 3 17 8" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <polyline points="7 16 12 21 17 16" />
        </svg>
      )}
    </span>
  );

  return (
    <div className={containerClass}>
      {axis === "x"
        ? [zoomOutButton, decorativeIcon, zoomInButton]
        : [zoomInButton, decorativeIcon, zoomOutButton]}
    </div>
  );
}

/**
 * Charts Component - Simplified graphs with all functionality
 * Combines all chart logic into one simple component
 */
function Charts({ data, simulation, onSeek }) {
  // State for drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useState({
    showPosition: true,
    showVelocity: true,
    showAcceleration: true,
  });
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

  const handleZoom = (index, axis, factor) => {
    const chart = chartRefs.current[index];
    if (!chart || maxTime === 0) return;

    chart.zoom({ [axis]: factor });
    if (axis === "x") {
      chart.zoomScale("x", { min: 0, max: chart.scales.x.max - chart.scales.x.min });
    }
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
          min: 0,
          max: maxTime,
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
            x: { min: 0, max: maxTime },
            y: { min: yMin, max: yMax },
          },
          zoom: { mode: "xy" },
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
          <div className="relative flex-auto bg-gray-100 h-[150px] pt-8 px-8 rounded-md">
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
              onZoomIn={() => handleZoom(0, "y", 1.2)}
              onZoomOut={() => handleZoom(0, "y", 0.8)}
            />
            <ChartZoomControls
              axis="x"
              onZoomIn={() => handleZoom(0, "x", 1.2)}
              onZoomOut={() => handleZoom(0, "x", 0.8)}
            />
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
          <div className="relative flex-auto bg-gray-100 h-[150px] pt-8 px-8 rounded-md">
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
              onZoomIn={() => handleZoom(1, "y", 1.2)}
              onZoomOut={() => handleZoom(1, "y", 0.8)}
            />
            <ChartZoomControls
              axis="x"
              onZoomIn={() => handleZoom(1, "x", 1.2)}
              onZoomOut={() => handleZoom(1, "x", 0.8)}
            />
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
          <div className="relative flex-auto bg-gray-100 h-[150px] pt-8 px-8 rounded-md">
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
              onZoomIn={() => handleZoom(2, "y", 1.2)}
              onZoomOut={() => handleZoom(2, "y", 0.8)}
            />
            <ChartZoomControls
              axis="x"
              onZoomIn={() => handleZoom(2, "x", 1.2)}
              onZoomOut={() => handleZoom(2, "x", 0.8)}
            />
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
