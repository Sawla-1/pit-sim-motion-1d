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

// Register Chart.js plugins
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Decimation,
  annotationPlugin
);

// Single chevron button, rotated per direction, used for the pan controls.
function PanButton({ direction, onClick, label, disabled }) {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full bg-gray-200 p-0.5 transition-transform hover:bg-gray-300 hover:text-gray-900 ${
        disabled ? "opacity-30 pointer-events-none" : "cursor-pointer hover:scale-125"
      }`}
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
function ResetButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      aria-label="Reset zoom"
      title="Reset zoom"
      onClick={onClick}
      disabled={disabled}
      className={`absolute bottom-2 right-2 transition-transform text-gray-600 hover:text-gray-900 ${
        disabled ? "opacity-30 pointer-events-none" : "cursor-pointer hover:scale-125"
      }`}
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
function ChartZoomControls({
  axis, onZoomIn, onZoomOut, onPanPositive, onPanNegative,
  zoomInDisabled, zoomOutDisabled, panPositiveDisabled, panNegativeDisabled,
}) {
  const containerClass =
    axis === "x"
      ? "absolute bottom-2 right-16 flex flex-row items-center gap-3 text-gray-600"
      : "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-gray-600";

  const zoomInButton = (
    <button
      key="in"
      type="button"
      aria-label="Zoom in"
      title="Zoom in"
      onClick={onZoomIn}
      disabled={zoomInDisabled}
      className={`transition-transform hover:text-gray-900 ${
        zoomInDisabled ? "opacity-30 pointer-events-none" : "cursor-pointer hover:scale-125"
      }`}
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
      title="Zoom out"
      onClick={onZoomOut}
      disabled={zoomOutDisabled}
      className={`transition-transform hover:text-gray-900 ${
        zoomOutDisabled ? "opacity-30 pointer-events-none" : "cursor-pointer hover:scale-125"
      }`}
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
      disabled={panPositiveDisabled}
    />
  );

  const panNegativeButton = (
    <PanButton
      key="pan-neg"
      direction={axis === "x" ? "right" : "down"}
      onClick={onPanNegative}
      label={axis === "x" ? "Pan right" : "Pan down"}
      disabled={panNegativeDisabled}
    />
  );

  // Pan buttons stay tight together as their own cluster, separated from the
  // zoom buttons by the container's wider gap.
  const panGroup = (
    <div
      key="pan-group"
      className={axis === "x" ? "flex flex-row items-center gap-1" : "flex flex-col items-center gap-1"}
    >
      {panPositiveButton}
      {panNegativeButton}
    </div>
  );

  return (
    <div className={containerClass}>
      {axis === "x"
        ? [zoomOutButton, panGroup, zoomInButton]
        : [zoomInButton, panGroup, zoomOutButton]}
    </div>
  );
}

/**
 * Charts Component - Simplified graphs with all functionality
 * Combines all chart logic into one simple component
 */
const MIN_ZOOM_WINDOW = 1; // seconds - smallest visible x-axis window when zoomed in

function Charts({ data, simulation, onSeek, playing }) {
  // State for drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useState({
    showPosition: true,
    showVelocity: true,
    showAcceleration: true,
  });
  // Shared x-axis (time) zoom window across all three charts. null = full/auto range.
  const [xRange, setXRange] = useState(null);
  // Y-axis zoom window, independent per chart - same pattern as xRange, just
  // keyed by chart index. undefined per-index = full/auto range for that chart.
  const [yRanges, setYRanges] = useState({}); // { [index]: { min, max } }
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
    if (maxTime === 0) {
      if (xRange !== null) setXRange(null);
      setYRanges((prev) => (Object.keys(prev).length > 0 ? {} : prev));
    }
  }, [maxTime, xRange]);

  // Resuming a RECORDING should show the live growing timeline, not a
  // window you zoomed into before pausing - reset both axes back to
  // full/auto view. Playback mode's data is a fixed, already-recorded
  // array (it never grows), so there's no staleness risk there - resetting
  // zoom on every playback resume would just be an unwanted interruption.
  useEffect(() => {
    if (playing && data.selectedMode === "record") {
      setXRange(null);
      setYRanges({});
    }
  }, [playing, data.selectedMode]);

  // ---- Drag-to-scrub (playback mode) ----

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

  // ---- X-axis: shared time window across all 3 charts ----

  // Shared across all charts, since they all share the same time axis.
  const handleXZoom = (factor) => {
    if (maxTime === 0) return;
    if (factor > 1 && maxTime < MIN_ZOOM_WINDOW) return; // not enough data to zoom in

    const currentMax = xRange?.max ?? maxTime;
    const requestedMax = currentMax / factor;
    const newMax = factor > 1
      ? Math.max(MIN_ZOOM_WINDOW, requestedMax) // zoom in: never shrink below MIN_ZOOM_WINDOW
      : Math.min(maxTime, requestedMax);         // zoom out: never exceed full data

    // Reset to null (full/auto range) instead of an explicit {0, maxTime}
    // snapshot once zoomed all the way out - null auto-tracks a still-growing
    // recording, a frozen snapshot would go stale the moment more data comes in.
    setXRange(newMax >= maxTime ? null : { min: 0, max: newMax });
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

  // X-axis disabled states - button should visibly reflect when a click
  // would be a no-op, since x-zoom/pan state is already tracked in React.
  const xZoomInDisabled = maxTime < MIN_ZOOM_WINDOW ||
    (xRange !== null && xRange.max - xRange.min <= MIN_ZOOM_WINDOW);
  const xZoomOutDisabled = maxTime === 0 || xRange === null || xRange.max - xRange.min >= maxTime;
  const xPanLeftDisabled = maxTime === 0 || xRange === null || xRange.min <= 0;
  const xPanRightDisabled = maxTime === 0 || xRange === null || xRange.max >= maxTime;

  // ---- Y-axis: independent per chart, same pattern as the x-axis above ----

  // Padded so a flat/near-constant dataset (e.g. acceleration held at 0, or a
  // perfectly steady velocity) doesn't give zoom-in a zero-width range to
  // shrink toward - without padding, a single zoom-in click would collapse
  // the y-axis down to nothing (no ticks, invisible line). yMinRange is the
  // floor the zoomed window itself can shrink to, so repeated zoom-ins stop
  // cleanly instead of collapsing the axis.
  const getYRange = (valueKey) => {
    const values = data.recordedData.map((state) => state[valueKey]);
    const rawMin = values.length > 0 ? values.reduce((a, b) => Math.min(a, b)) : -1;
    const rawMax = values.length > 0 ? values.reduce((a, b) => Math.max(a, b)) : 1;
    const span = rawMax - rawMin;
    const pad = span > 0 ? span * 0.1 : Math.max(Math.abs(rawMax), Math.abs(rawMin), 1) * 0.1;
    return { yMin: rawMin - pad, yMax: rawMax + pad, yMinRange: pad };
  };

  // Zooms around the center of the current window (unlike the x-axis, a
  // value axis has no natural zero anchor to zoom from).
  const handleYZoom = (valueKey, index, factor) => {
    if (maxTime === 0) return;
    const { yMin, yMax, yMinRange } = getYRange(valueKey);
    const current = yRanges[index] ?? { min: yMin, max: yMax };
    const width = current.max - current.min;
    if (factor > 1 && width <= yMinRange) return; // already at the smallest allowed window

    const newWidth = factor > 1
      ? Math.max(yMinRange, width / factor)    // zoom in: never shrink below yMinRange
      : Math.min(yMax - yMin, width / factor); // zoom out: never exceed full data view

    // At the full-range floor, reset to undefined (full/auto range) instead
    // of an explicit {yMin, yMax} snapshot - undefined auto-tracks a
    // still-growing recording, while a frozen snapshot would go stale the
    // moment more data comes in (and computing it via mid/halfWidth risks a
    // floating-point hair-short edge that desyncs one pan button anyway).
    if (newWidth >= yMax - yMin) {
      setYRanges((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    const halfWidth = newWidth / 2;
    // Clamp the center so a wide window can't spill past [yMin, yMax] on one
    // side even though its width is already capped correctly.
    const mid = Math.min(Math.max((current.min + current.max) / 2, yMin + halfWidth), yMax - halfWidth);

    setYRanges((prev) => ({ ...prev, [index]: { min: mid - halfWidth, max: mid + halfWidth } }));
  };

  // Same shifting logic as handleXPan, clamped to [yMin, yMax] instead of [0, maxTime].
  const handleYPan = (valueKey, index, direction) => {
    if (maxTime === 0) return;
    const { yMin, yMax } = getYRange(valueKey);
    const current = yRanges[index] ?? { min: yMin, max: yMax };
    const windowWidth = current.max - current.min;
    if (windowWidth >= yMax - yMin) return; // fully zoomed out - nothing to pan

    const step = windowWidth * 0.2 * direction;
    let newMin = current.min + step;
    let newMax = current.max + step;

    if (newMin < yMin) {
      newMax -= newMin - yMin;
      newMin = yMin;
    } else if (newMax > yMax) {
      newMin -= newMax - yMax;
      newMax = yMax;
    }

    setYRanges((prev) => ({ ...prev, [index]: { min: newMin, max: newMax } }));
  };

  // Y-axis disabled states, mirroring the x-axis ones above.
  const getYDisabled = (valueKey, index) => {
    const { yMin, yMax, yMinRange } = getYRange(valueKey);
    const current = yRanges[index];
    return {
      zoomInDisabled: maxTime === 0 || (current !== undefined && current.max - current.min <= yMinRange),
      zoomOutDisabled: maxTime === 0 || current === undefined || current.max - current.min >= yMax - yMin,
      panUpDisabled: maxTime === 0 || current === undefined || current.max >= yMax,
      panDownDisabled: maxTime === 0 || current === undefined || current.min <= yMin,
    };
  };

  const positionYDisabled = getYDisabled("position", 0);
  const velocityYDisabled = getYDisabled("velocity", 1);
  const accelerationYDisabled = getYDisabled("acceleration", 2);

  // ---- Reset (touches both axes) ----

  // Resets this chart's y-axis zoom/pan, and the shared x-axis window
  // (which resets it for all three charts, same as x-zoom/pan already do).
  const handleReset = (index) => {
    setXRange(null);
    setYRanges((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const isResetDisabled = (index) => xRange === null && yRanges[index] === undefined;

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
          min: xRange?.min ?? 0,
          max: xRange?.max ?? maxTime,
        },
        y: {
          type: "linear",
          // undefined when never zoomed - Chart.js autoscales normally in
          // that case. Once zoomed, this pins the range so it survives
          // re-renders instead of being recalculated from the full dataset.
          min: yRanges[index]?.min,
          max: yRanges[index]?.max,
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
              onZoomIn={() => handleYZoom("position", 0, 1.2)}
              onZoomOut={() => handleYZoom("position", 0, 0.8)}
              onPanPositive={() => handleYPan("position", 0, 1)}
              onPanNegative={() => handleYPan("position", 0, -1)}
              zoomInDisabled={positionYDisabled.zoomInDisabled}
              zoomOutDisabled={positionYDisabled.zoomOutDisabled}
              panPositiveDisabled={positionYDisabled.panUpDisabled}
              panNegativeDisabled={positionYDisabled.panDownDisabled}
            />
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
            <ResetButton onClick={() => handleReset(0)} disabled={isResetDisabled(0)} />
            <Line
              data={buildChartData("position", "#1976d2")}
              options={getChartOptions(0)}
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
              onZoomIn={() => handleYZoom("velocity", 1, 1.2)}
              onZoomOut={() => handleYZoom("velocity", 1, 0.8)}
              onPanPositive={() => handleYPan("velocity", 1, 1)}
              onPanNegative={() => handleYPan("velocity", 1, -1)}
              zoomInDisabled={velocityYDisabled.zoomInDisabled}
              zoomOutDisabled={velocityYDisabled.zoomOutDisabled}
              panPositiveDisabled={velocityYDisabled.panUpDisabled}
              panNegativeDisabled={velocityYDisabled.panDownDisabled}
            />
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
            <ResetButton onClick={() => handleReset(1)} disabled={isResetDisabled(1)} />
            <Line
              data={buildChartData("velocity", "#d32f2f")}
              options={getChartOptions(1)}
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
              onZoomIn={() => handleYZoom("acceleration", 2, 1.2)}
              onZoomOut={() => handleYZoom("acceleration", 2, 0.8)}
              onPanPositive={() => handleYPan("acceleration", 2, 1)}
              onPanNegative={() => handleYPan("acceleration", 2, -1)}
              zoomInDisabled={accelerationYDisabled.zoomInDisabled}
              zoomOutDisabled={accelerationYDisabled.zoomOutDisabled}
              panPositiveDisabled={accelerationYDisabled.panUpDisabled}
              panNegativeDisabled={accelerationYDisabled.panDownDisabled}
            />
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
            <ResetButton onClick={() => handleReset(2)} disabled={isResetDisabled(2)} />
            <Line
              data={buildChartData("acceleration", "#2e7d32")}
              options={getChartOptions(2)}
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
