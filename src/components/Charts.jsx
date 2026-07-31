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

  const isPlayback = data.selectedMode === "playback";

  // Simplified chart options
  const getChartOptions = () => {
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
          limits: { x: { min: 0, max: maxTime } },
          zoom: { wheel: { enabled: isPlayback }, mode: "x" },
          pan: {
            enabled: isPlayback,
            mode: "x",
            limits: { x: { min: 0, max: maxTime } },
          },
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
            <Line
              data={buildChartData("position", "#1976d2")}
              options={getChartOptions()}
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
            <Line
              data={buildChartData("velocity", "#d32f2f")}
              options={getChartOptions()}
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
            <Line
              data={buildChartData("acceleration", "#2e7d32")}
              options={getChartOptions()}
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
