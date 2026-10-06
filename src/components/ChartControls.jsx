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
import { whiteLook, disabledIcon, offPill } from "../styles/buttonStyles";

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

// Thin-line icons (drawn inside a 24x24 box), one per pill button
const ICONS = {
  up: <polyline points="6 15 12 9 18 15" />,
  down: <polyline points="6 9 12 15 18 9" />,
  left: <polyline points="15 6 9 12 15 18" />,
  right: <polyline points="9 6 15 12 9 18" />,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  minus: <line x1="5" y1="12" x2="19" y2="12" />,
  reset: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" /></>,
};

// One cell of a pill: 20px square with a thin-line icon (kept at 20px so all
// buttons fit on short charts). `wide` = 44px, as wide as two pills side by side.
// Hover = light blue cell + blue icon. Off = grey cell + pale icon.
function PillButton({ label, icon, onClick, disabled, wide }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`${wide ? "w-11" : "w-5"} h-5 flex items-center justify-center cursor-pointer transition-colors enabled:hover:bg-blue-50 enabled:hover:text-blue-600 enabled:active:bg-blue-100 ${disabledIcon}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
    </button>
  );
}

// A white rounded box holding PillButtons, split by thin lines.
// overflow-hidden keeps each cell's hover color inside the rounded corners.
// allOff: every cell is off, so the whole box turns grey.
function Pill({ vertical, allOff, children }) {
  return (
    <div className={`flex rounded-md overflow-hidden ${
      allOff ? offPill : `${whiteLook} divide-[#d9dee6]`
    } ${vertical ? "flex-col divide-y" : "flex-row divide-x"}`}>
      {children}
    </div>
  );
}

// Zoom + pan buttons for one axis, as two pills.
// Both axes sit in ChartPanel's right-edge button column.
// axis="y": pan pill (up/down) on the left, zoom pill (+, -, reset) on the right.
// The reset cell is only there when onReset is given (not on the bottom chart,
// which has its own wide reset under both axes, see ChartPanel).
// axis="x" (time, bottom chart only): zoom pill (-, +) on top, pan pill (left/right) below.
export function ChartZoomControls({
  axis, onZoomIn, onZoomOut, onPanPositive, onPanNegative, onReset,
  zoomInDisabled, zoomOutDisabled, panPositiveDisabled, panNegativeDisabled, resetDisabled,
}) {
  const isX = axis === "x";
  const zoomIn = <PillButton label="Zoom in" icon={ICONS.plus} onClick={onZoomIn} disabled={zoomInDisabled} />;
  const zoomOut = <PillButton label="Zoom out" icon={ICONS.minus} onClick={onZoomOut} disabled={zoomOutDisabled} />;

  const panPill = (
    <Pill vertical={!isX} allOff={panPositiveDisabled && panNegativeDisabled}>
      <PillButton label={isX ? "Pan left" : "Pan up"} icon={isX ? ICONS.left : ICONS.up} onClick={onPanPositive} disabled={panPositiveDisabled} />
      <PillButton label={isX ? "Pan right" : "Pan down"} icon={isX ? ICONS.right : ICONS.down} onClick={onPanNegative} disabled={panNegativeDisabled} />
    </Pill>
  );

  if (isX) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Pill allOff={zoomInDisabled && zoomOutDisabled}>{zoomOut}{zoomIn}</Pill>
        {panPill}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {panPill}
      <Pill vertical allOff={zoomInDisabled && zoomOutDisabled && (!onReset || resetDisabled)}>
        {zoomIn}
        {zoomOut}
        {onReset && <PillButton label="Reset zoom" icon={ICONS.reset} onClick={onReset} disabled={resetDisabled} />}
      </Pill>
    </div>
  );
}

// Scrub hint: a hand + ↔ arrow + text that fades in and out, centered on the
// plot. It ignores clicks, so dragging still works under it.
function ScrubHint() {
  return (
    <div role="status" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2 text-blue-600 drop-shadow-[0_0_3px_white] motion-safe:animate-pulse">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 14a8 8 0 0 1-8 8" />
        <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
        <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
        <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
      <div className="flex flex-col items-center">
        <svg width="40" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="18 8 22 12 18 16" />
          <polyline points="6 8 2 12 6 16" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
        <span className="text-sm font-bold whitespace-nowrap">Drag to move time</span>
      </div>
    </div>
  );
}

// One chart's full row: its input panel, the hide button, the zoom/pan/reset
// pills, and the Line chart. When hidden, it shows one slim line with the
// chart's name and a "show" button. Takes values/callbacks already bound to
// a specific chart from the call site (same pattern as PhysicsInput in
// App.jsx), so it has no idea which chart it's rendering.
export function ChartPanel({
  label, input,
  visible, onShow, onHide,
  showZoomControls, yControlsProps, xControls, isBottom, scrubHint, onReset, resetDisabled,
  chartData, chartOptions, chartRef,
}) {
  if (!visible) {
    return (
      // Hidden chart: its input hides too; one slim line with a round
      // white "show" button (light grey on hover)
      <div className="flex items-center justify-end gap-3 pr-16 py-1 text-lg font-semibold text-gray-700">
        {label}
        <button
          type="button"
          onClick={onShow}
          aria-label={`Show ${label} chart`}
          title={`Show ${label} chart`}
          className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-100 active:bg-gray-200 ${whiteLook}`}
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
        {scrubHint && <ScrubHint />}
        {/* Right edge: y pan + zoom pills (reset is inside the zoom pill).
            Bottom chart only: the time pills below, then one wide reset under
            both axes. One flex column, so the buttons can't overlap. */}
        <div className="absolute top-2 bottom-2 right-1 flex flex-col items-center justify-center gap-1">
          {showZoomControls && (
            <ChartZoomControls axis="y" {...yControlsProps} onReset={isBottom ? undefined : onReset} resetDisabled={resetDisabled} />
          )}
          {showZoomControls && isBottom && xControls}
          {showZoomControls && isBottom && (
            <Pill allOff={resetDisabled}>
              <PillButton wide label="Reset zoom" icon={ICONS.reset} onClick={onReset} disabled={resetDisabled} />
            </Pill>
          )}
        </div>
        <Line data={chartData} options={chartOptions} ref={chartRef} />
      </div>
    </div>
  );
}
