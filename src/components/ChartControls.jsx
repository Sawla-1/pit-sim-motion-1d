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

// One look for every small chart button: fills dark grey on hover,
// darker while pressed, faded when it can't be used.
function iconButtonClass(disabled) {
  return `transition-colors ${
    disabled
      ? "opacity-30 pointer-events-none"
      : "cursor-pointer hover:bg-gray-500 hover:text-white active:bg-gray-700"
  }`;
}

// Single chevron button, rotated per direction, used for the pan controls.
// It's one half of the pan pill (see panGroup), which gives it the grey.
function PanButton({ direction, onClick, label, disabled }) {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={iconButtonClass(disabled)}
    >
      <svg
        width="20"
        height="20"
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
      className={`rounded-full bg-gray-200 text-gray-600 p-0.5 ${iconButtonClass(disabled)}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <polyline points="3 3 3 8 8 8" />
      </svg>
    </button>
  );
}

// Zoom + pan toolbar: zoom in / pan buttons / zoom out.
// axis="y" is a 2x2 grid on the right edge: zoom in/out stacked on the left,
// the up/down pan pill beside them (only 2 rows tall, so the buttons can be
// bigger). axis="x" is a row along the bottom edge (pan left/right between
// the zoom buttons).
export function ChartZoomControls({
  axis, onZoomIn, onZoomOut, onPanPositive, onPanNegative,
  zoomInDisabled, zoomOutDisabled, panPositiveDisabled, panNegativeDisabled,
}) {
  const containerClass =
    axis === "x"
      ? "absolute bottom-1 right-16 flex flex-row items-center gap-3 text-gray-600"
      : "grid grid-cols-2 gap-0.5 text-gray-600"; // placed by ChartPanel's button column

  const zoomInButton = (
    <button
      key="in"
      type="button"
      aria-label="Zoom in"
      title="Zoom in"
      onClick={onZoomIn}
      disabled={zoomInDisabled}
      className={`rounded-full bg-gray-200 p-0.5 ${iconButtonClass(zoomInDisabled)}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      className={`rounded-full bg-gray-200 p-0.5 ${iconButtonClass(zoomOutDisabled)}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  // Both pan buttons share one pill, split by a thin line (like PhET).
  // overflow-hidden keeps each half's hover color inside the rounded ends.
  const panGroup = (
    <div
      key="pan-group"
      className={`flex rounded-full bg-gray-200 overflow-hidden divide-gray-300 ${
        axis === "x" ? "flex-row divide-x" : "flex-col divide-y row-span-2" // y: spans both grid rows
      }`}
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

// One chart's full panel: visibility toggle, hide button, zoom/pan/reset
// controls, and the Line chart. The chart's name is drawn by Chart.js as
// the y-axis title (see Charts.jsx). Takes values/callbacks already bound to
// a specific chart from the call site (same pattern as PhysicsInput in
// Controls.jsx), so it has no idea which chart it's rendering.
export function ChartPanel({
  label,
  visible, onShow, onHide,
  showZoomControls, yControlsProps, xControls, isBottom, onReset, resetDisabled,
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
    // Phones/tablets: fixed heights. Desktop: the charts share the space under
    // the 3D scene. The bottom chart is taller (1.3 shares): it also holds the
    // time numbers and the shared time zoom buttons (in its extra bottom padding).
    // The minimums keep the right-edge button column (~100px) from overlapping
    // on short screens; below them the page scrolls instead.
    <div className={`relative bg-gray-100 pt-2 pl-2 pr-12 rounded-md ${
      isBottom
        ? "h-[160px] lg:h-auto lg:min-h-[160px] lg:flex-[1.3] pb-6"
        : "h-[126px] lg:h-auto lg:min-h-[124px] lg:flex-1 pb-2"
    }`}>
      {/* Right edge: ✖ at the top, y zoom in the middle, reset at the bottom.
          One flex column, so the buttons can't overlap however short the chart is. */}
      <div className="absolute top-2 bottom-2 right-1 flex flex-col items-center justify-between">
        <button
          className="text-xs text-white font-semibold cursor-pointer bg-red-600 px-1 py-0.5 rounded-sm"
          onClick={onHide}
        >
          ✖
        </button>
        {showZoomControls && <ChartZoomControls axis="y" {...yControlsProps} />}
        {showZoomControls && <ResetButton onClick={onReset} disabled={resetDisabled} />}
      </div>
      {showZoomControls && isBottom && xControls}
      <Line data={chartData} options={chartOptions} ref={chartRef} />
    </div>
  );
}
