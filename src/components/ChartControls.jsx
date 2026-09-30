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

// PhET-style plot area: white inside, dark frame around it. Chart.js has no
// built-in full frame (only the left/bottom axis lines), so this small
// plugin draws it.
const plotFrame = {
  id: "plotFrame",
  beforeDraw(chart) {
    // Before the grid and lines: white background.
    const { ctx, chartArea: { left, top, width, height } } = chart;
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.fillRect(left, top, width, height);
    ctx.restore();
  },
  beforeDatasetsDraw(chart) {
    // Dark frame, drawn before the data lines and the "now" marker so they
    // stay visible on top of it (e.g. the marker at time 0 or at the end).
    const { ctx, chartArea: { left, top, width, height } } = chart;
    ctx.save();
    ctx.strokeStyle = "#6b7280"; // grey, 2px, like the mockup
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, width, height);
    ctx.restore();
  },
};

// Register Chart.js plugins
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Decimation,
  annotationPlugin,
  plotFrame
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
  label, input,
  visible, onShow, onHide,
  showZoomControls, yControlsProps, xControls, isBottom, onReset, resetDisabled,
  chartData, chartOptions, chartRef,
}) {
  if (!visible) {
    return (
      // Hidden chart: its input hides too; one slim line with a round
      // "show" button (same style as the prev/next buttons)
      <div className="flex items-center gap-3 sm:ml-4 text-lg font-semibold text-gray-700">
        <button
          type="button"
          onClick={onShow}
          aria-label={`Show ${label} chart`}
          title={`Show ${label} chart`}
          className="w-9 h-9 rounded-full border border-[#d9dee6] bg-white text-slate-700 flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-50"
        >
          {/* Plus icon = "add this chart back" (pairs with the ✖) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        {label}
      </div>
    );
  }

  return (
    // One row: input on the left, chart on the right (phones: input on top).
    // Phones/tablets: fixed chart heights. Desktop: the rows share the space
    // under the 3D scene. The bottom row is exactly 34px taller: 26px of time
    // numbers (fixed in Charts.jsx) minus the other charts' ~8px of x tick marks,
    // plus 16px more bottom padding for the time zoom buttons. So all 3 plots
    // are the same height.
    // The minimums keep the right-edge button column from overlapping on
    // short screens; below them the middle area scrolls instead.
    <div className={`flex flex-col sm:flex-row gap-3 ${
      isBottom ? "lg:flex-[1_1_34px] lg:min-h-[122px]" : "lg:flex-1 lg:min-h-[88px]"
    }`}>
      {/* Bottom row: 34px under the input, so its slider ends where the plot ends */}
      <div className={`flex ${isBottom ? "sm:pb-[34px]" : ""}`}>{input}</div>
      <div className={`relative flex-1 min-w-0 pt-2 pr-12 ${
        isBottom ? "h-[160px] lg:h-auto pb-6" : "h-[126px] lg:h-auto pb-2"
      }`}>
        {/* Hide button: inside the plot's top-right corner
            (48px button column + 16px chart padding + 4px gap) */}
        <button
          type="button"
          aria-label={`Hide ${label} chart`}
          onClick={onHide}
          className="absolute top-5 right-[68px] z-10 w-6 h-6 rounded bg-[#E31E24] text-white text-xs font-bold cursor-pointer"
        >
          ✖
        </button>
        {/* Right edge: y zoom + pan in the middle, reset at the bottom.
            One flex column, so the buttons can't overlap however short the chart is. */}
        <div className="absolute top-2 bottom-2 right-1 flex flex-col items-center justify-between">
          <div />
          {showZoomControls && <ChartZoomControls axis="y" {...yControlsProps} />}
          {showZoomControls && <ResetButton onClick={onReset} disabled={resetDisabled} />}
        </div>
        {showZoomControls && isBottom && xControls}
        <Line data={chartData} options={chartOptions} ref={chartRef} />
      </div>
    </div>
  );
}
