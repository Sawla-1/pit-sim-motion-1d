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
import { whiteLook, disabledIcon, offPill } from "./buttonStyles";

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

// Same look as the bottom bar's prev/next buttons: white, thin grey border,
// soft shadow, dark slate icon. Kept at 20px so all buttons fit on short charts.
// Active = white, raised (shadow), dark icon. Disabled = grey, flat, pale icon
// (the icon stays visible so you can still tell which button it is).
const whiteButton = `${whiteLook} ${disabledIcon}`;
const roundButton = `w-5 h-5 rounded-full flex items-center justify-center ${whiteButton}`;

// One behaviour for every small chart button: light grey on hover,
// a bit darker while pressed, "not allowed" cursor when it can't be used.
function iconButtonClass(disabled) {
  return `transition-colors ${
    disabled
      ? "cursor-not-allowed"
      : "cursor-pointer hover:bg-gray-100 active:bg-gray-200"
  }`;
}

// Single filled triangle button, rotated per direction, used for the pan controls.
// It's one half of the pan pill (see panGroup), which gives it the white look.
function PanButton({ direction, onClick, label, disabled }) {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`w-5 h-5 flex items-center justify-center ${disabledIcon} ${iconButtonClass(disabled)}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: `rotate(${rotation}deg)` }}>
        <path d="M12 4 22 20H2z" />
      </svg>
    </button>
  );
}

// Reset-zoom button - small counterclockwise-arrow icon, same white look.
function ResetButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      aria-label="Reset zoom"
      title="Reset zoom"
      onClick={onClick}
      disabled={disabled}
      className={`${roundButton} ${iconButtonClass(disabled)}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <polyline points="3 3 3 8 8 8" />
      </svg>
    </button>
  );
}

// Zoom + pan toolbar: zoom in / pan buttons / zoom out.
// Both axes sit in ChartPanel's right-edge button column (like PhET).
// axis="y": zoom in/out stacked on the left, the up/down pan pill beside them.
// axis="x" (time, bottom chart only): zoom out/in on top, left/right pan pill below.
export function ChartZoomControls({
  axis, onZoomIn, onZoomOut, onPanPositive, onPanNegative,
  zoomInDisabled, zoomOutDisabled, panPositiveDisabled, panNegativeDisabled,
}) {
  // y: 2 columns (zoom stacked | pan pill up/down); x: 2 rows (zoom row, pan pill left/right)
  const containerClass = axis === "x"
    ? "flex flex-col items-center gap-0.5"
    : "grid grid-cols-2 gap-0.5"; // placed by ChartPanel's button column

  const zoomInButton = (
    <button
      key="in"
      type="button"
      aria-label="Zoom in"
      title="Zoom in"
      onClick={onZoomIn}
      disabled={zoomInDisabled}
      className={`${roundButton} ${iconButtonClass(zoomInDisabled)}`}
    >
      {/* Plus = zoom in */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="4" x2="12" y2="20" />
        <line x1="4" y1="12" x2="20" y2="12" />
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
      className={`${roundButton} ${iconButtonClass(zoomOutDisabled)}`}
    >
      {/* Minus = zoom out */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <line x1="4" y1="12" x2="20" y2="12" />
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

  // Both pan buttons share one white pill, split by a thin line (like PhET).
  // overflow-hidden keeps each half's hover color inside the rounded ends.
  // Whole pill looks "off" only when both halves are off
  const panAllOff = panPositiveDisabled && panNegativeDisabled;
  const panGroup = (
    <div
      key="pan-group"
      className={`flex rounded-full overflow-hidden ${
        panAllOff
          ? offPill
          : `${whiteLook} divide-[#d9dee6]`
      } ${
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
        ? [<div key="zoom" className="flex gap-0.5">{zoomOutButton}{zoomInButton}</div>, panGroup]
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
      <div className="flex items-center justify-end gap-3 pr-2 py-1 text-lg font-semibold text-gray-700">
        {label}
        <button
          type="button"
          onClick={onShow}
          aria-label={`Show ${label} chart`}
          title={`Show ${label} chart`}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${whiteButton} ${iconButtonClass(false)}`}
        >
          {/* Plus icon = "add this chart back" (pairs with the ✖) */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    // One row: input on the left, chart on the right (phones: input on top).
    // Phones/tablets: fixed chart heights. Desktop: the rows share the space
    // under the 3D scene. The bottom row is exactly 18px taller: 26px of time
    // numbers (fixed in Charts.jsx) minus the other charts' ~8px of x tick marks.
    // So all 3 plots are the same height.
    // The minimums keep the right-edge button column from overlapping on
    // short screens; below them the middle area scrolls instead.
    <div className={`flex flex-col sm:flex-row gap-3 ${
      // Tablets: the row has the fixed height (not just the chart), so the
      // vertical slider has a real height to fill instead of the whole screen.
      isBottom
        ? "sm:h-[144px] lg:h-auto lg:flex-[1_1_18px] lg:min-h-[106px]"
        : "sm:h-[126px] lg:h-auto lg:flex-1 lg:min-h-[88px]"
    }`}>
      {/* Bottom row: 18px under the input, so its slider ends where the plot ends */}
      <div className={`flex ${isBottom ? "sm:pb-[18px]" : ""}`}>{input}</div>
      <div className={`relative flex-1 min-w-0 pt-0.5 pb-0.5 pr-12 ${
        isBottom ? "h-[144px] sm:h-auto" : "h-[126px] sm:h-auto"
      }`}>
        {/* Hide button: inside the plot's top-right corner
            (48px button column + 16px chart padding + 4px gap) */}
        <button
          type="button"
          aria-label={`Hide ${label} chart`}
          onClick={onHide}
          className="absolute top-[14px] right-[68px] z-10 w-6 h-6 rounded bg-[#E31E24] text-white text-xs font-bold cursor-pointer"
        >
          ✖
        </button>
        {/* Right edge (like PhET): y zoom + pan, then time zoom + pan (bottom chart
            only), reset at the bottom. One flex column, so the buttons can't
            overlap however short the chart is. */}
        <div className="absolute top-2 bottom-2 right-1 flex flex-col items-center justify-between">
          <div />
          {showZoomControls && <ChartZoomControls axis="y" {...yControlsProps} />}
          {showZoomControls && isBottom && xControls}
          {showZoomControls && <ResetButton onClick={onReset} disabled={resetDisabled} />}
        </div>
        <Line data={chartData} options={chartOptions} ref={chartRef} />
      </div>
    </div>
  );
}
