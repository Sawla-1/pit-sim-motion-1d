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
export function ChartZoomControls({
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

// One chart's full panel: visibility toggle, header, zoom/pan/reset controls,
// and the Line chart. Takes values/callbacks already bound to a specific
// chart from the call site (same pattern as PhysicsInput in Controls.jsx),
// so it has no idea which chart it's rendering.
export function ChartPanel({
  label, unit, textClass, value,
  visible, onShow, onHide,
  showZoomControls, yControlsProps, xControls, onReset, resetDisabled,
  chartData, chartOptions, chartRef,
}) {
  if (!visible) {
    return (
      <div>
        {label} Graph{" "}
        <button className="cursor-pointer" onClick={onShow}>
          ❇️
        </button>{" "}
      </div>
    );
  }

  return (
    <div className="relative flex-auto bg-gray-100 h-[clamp(170px,20vh,220px)] pt-8 pb-6 px-8 rounded-md">
      <span className={`absolute top-2 left-8 text-sm font-semibold ${textClass}`}>
        {label}
      </span>
      <span className={`absolute top-2 right-10 text-sm font-semibold ${textClass}`}>
        {formatNumber(value, 2)} {unit}
      </span>
      <button
        className="absolute top-2 right-2 text-xs text-white font-semibold cursor-pointer bg-red-600 px-1 py-0.5 rounded-sm"
        onClick={onHide}
      >
        ✖
      </button>
      {showZoomControls && (
        <>
          <ChartZoomControls axis="y" {...yControlsProps} />
          {xControls}
          <ResetButton onClick={onReset} disabled={resetDisabled} />
        </>
      )}
      <Line data={chartData} options={chartOptions} ref={chartRef} />
    </div>
  );
}
