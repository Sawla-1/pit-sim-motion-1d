import { useState, useRef } from "react";
import { formatNumber } from "../utils/formatNumber";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";

// Register Chart.js plugins
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  annotationPlugin,
  zoomPlugin
);

/**
 * Charts Component - Simplified graphs with all functionality
 * Combines all chart logic into one simple component
 */
function Charts({ data, simulation, onSetPlaybackTime }) {
  // State for drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useState({
    showPosition: true,
    showVelocity: true,
    showAcceleration: true,
  });
  const chartRefs = useRef([]);

  // Build chart data - simplified
  const buildChartData = (valueKey, color) => {
    const chartData = data.recordedData.map((state) => ({
      t: state.time,
      x: state.position,
      v: state.velocity,
      a: state.acceleration,
    }));
    return {
      datasets: [
        {
          data: chartData.map((item) => ({ x: item.t, y: item[valueKey] })),
          borderColor: color,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHitRadius: 10,
          tension: 0,
        },
      ],
    };
  };

  // Get max time for charts
  const getMaxTime = () => {
    return data.recordedData.length > 0
      ? data.recordedData[data.recordedData.length - 1].time
      : 0;
  };

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
        //>>> complex version
        // const rect = canvas.getBoundingClientRect()
        // const x = event.clientX - rect.left
        // const timeValue = (x / rect.width) * getMaxTime()
        // const clampedTime = Math.max(0, Math.min(maxTime, timeValue))

        //>>> simplified version
        const x = event.clientX - canvas.offsetLeft; // mouse position on canvas
        // console.log("event.clientX", event.clientX); // mouse position on screen
        // console.log("canvas.offsetLeft", canvas.offsetLeft); // chartcanvas start from left side of screen
        // console.log("x = event.clientX - canvas.offsetLeft", x);

        const timeValue = (x / canvas.offsetWidth) * getMaxTime(); // time value
        // console.log("canvas.offsetWidth", canvas.offsetWidth); // chartcanvas width
        // console.log("getMaxTime()", getMaxTime());// max time
        // console.log("timeValue = (x / canvas.offsetWidth) * getMaxTime()", timeValue);

        const clampedTime = Math.max(0, Math.min(getMaxTime(), timeValue)); // clamped time
        // console.log("Math.min(getMaxTime(), timeValue)", Math.min(getMaxTime(), timeValue));
        // console.log("clampedTime = Math.max(0, Math.min(getMaxTime(), timeValue))", clampedTime);
        // console.log("--------------------------------");
        onSetPlaybackTime(clampedTime); // set playback time
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Simplified chart options
  const getChartOptions = (yLabel) => {
    const maxTime = getMaxTime();

    return {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
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
        zoom: {
          limits: { x: { min: 0, max: maxTime } },
          zoom: { wheel: { enabled: true }, mode: "x" },
          pan: {
            enabled: true,
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
        className="flex flex-col gap-1 flex-3 w-full text-white text-right"
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
              data={buildChartData("x", "#1976d2")}
              options={getChartOptions("Position")}
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
              data={buildChartData("v", "#d32f2f")}
              options={getChartOptions("Velocity")}
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
              data={buildChartData("a", "#2e7d32")}
              options={getChartOptions("Acceleration")}
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
