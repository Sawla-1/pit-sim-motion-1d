import { useEffect, useId, useMemo, useRef, useState } from "react";
import { makeScale, invertScale, makeTicks, evenTicks, decimateMinMax, toPath, findNearestPoint } from "../utils/chartMath";
import { placePinLabels } from "../utils/pinLabels";
import { formatNumber } from "../utils/formatNumber";

// Space around the plot (px). The bottom is 26 when this chart shows the
// time numbers, else 8 (just the little tick marks), same as before.
const TOP = 8; // room for half of the top y number
const RIGHT = 16;
const TICK = 6; // length of a tick mark

// A line chart drawn with SVG. Props in only; it knows nothing about
// "position" or "velocity" (so simulation #2 can use it too).
// points = [{ x, y }, ...] sorted by x.
// nowX = where to draw the "now" band (data units, or leave out for none).
// pins = [{ name, x, y, text }] in data units; `text` is the label's words.
// onScrub(xValue) = called with the x under the pointer while it is pressed
// and dragged. Leave it out and the chart can't be dragged.
function SvgChart({ points, color, xMin, xMax, yMin, yMax, showXNumbers, label, nowX, pins = [], onScrub }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState(null); // the point under the pointer, in pixels
  const dragging = useRef(false); // a ref, not state: moves right after pointer-down must see it at once
  const clipId = useId(); // each chart needs its own clip id

  // Keep `size` equal to the real size on screen (needed to turn values into pixels)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Layout: the plot rectangle is left..right, top..bottom
  const narrow = size.width < 500;
  const left = narrow ? 56 : 70; // y numbers; a fixed width so all 3 plots line up
  const right = size.width - RIGHT;
  const top = TOP;
  const bottom = size.height - (showXNumbers ? 26 : 8);
  const fontSize = narrow || window.innerHeight <= 600 ? 13 : 16;
  const ready = right > left && bottom > top;

  // Before anything is recorded xMax equals xMin; show a 1 s window then
  const xEnd = xMax > xMin ? xMax : xMin + 1;

  const toX = useMemo(() => makeScale(xMin, xEnd, left, right), [xMin, xEnd, left, right]);
  const toY = useMemo(() => makeScale(yMin, yMax, bottom, top), [yMin, yMax, bottom, top]);

  // Only rebuilt when the data or the view changes, not on every frame
  const path = useMemo(() => {
    if (!ready) return "";
    const kept = decimateMinMax(points, xMin, xEnd, right - left);
    return toPath(kept.map((p) => ({ x: toX(p.x), y: toY(p.y) })));
  }, [ready, points, xMin, xEnd, left, right, toX, toY]);

  const xTicks = ready ? makeTicks(xMin, xEnd, Math.max(1, Math.floor((right - left) / 50))) : [];
  const yTicks = evenTicks(yMin, yMax, 5);
  const isZero = (t) => Math.abs(t) < 1e-9;

  // Pins in pixels, with their label spots (no overlaps)
  const placedPins = ready
    ? placePinLabels(
        pins.map((p) => ({ ...p, x: toX(p.x), y: toY(p.y) })),
        { left, right, top, bottom },
        // the red hide button sits in the plot's top-right corner (see ChartPanel)
        [{ left: right - 32, right, top, bottom: top + 32 }]
      )
    : [];

  // ---- Pointer: hover tooltip, and drag to scrub ----
  const pixelX = (event) => event.clientX - event.currentTarget.getBoundingClientRect().left;
  const pixelY = (event) => event.clientY - event.currentTarget.getBoundingClientRect().top;
  const fromX = invertScale(left, right, xMin, xEnd); // pixel → x value

  const handlePointerDown = (event) => {
    if (!onScrub || !ready) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId); // keep getting moves even if it slides off
    event.preventDefault();
    onScrub(fromX(pixelX(event)));
  };

  const handlePointerMove = (event) => {
    if (!ready) return;
    const x = pixelX(event);
    const y = pixelY(event);
    if (dragging.current) onScrub(fromX(x));
    // Show the tooltip only when the pointer is inside the plot and close to a point
    const inside = x >= left && x <= right && y >= top && y <= bottom;
    const point = inside ? findNearestPoint(points, { toX, toY, fromX }, x, y, 10) : null;
    setHover(point && { point, x: toX(point.x), y: toY(point.y) });
  };

  const stopDragging = () => {
    dragging.current = false;
  };

  return (
    <svg
      ref={ref} role="img" aria-label={label} className="block w-full h-full select-none"
      style={{ touchAction: onScrub ? "pan-y" : undefined }} // sideways finger drag scrubs; up/down still scrolls
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={() => setHover(null)}
    >
      {ready && (
        <>
          {/* white plot area */}
          <rect x={left} y={top} width={right - left} height={bottom - top} fill="#fff" />

          {/* grid: dashed light grey; the 0 line is dark and thicker */}
          {xTicks.map((t) => (
            <line key={`gx${t}`} x1={toX(t)} x2={toX(t)} y1={top} y2={bottom}
              stroke="#e5e7eb" strokeDasharray="4 4" />
          ))}
          {yTicks.map((t) => (
            <line key={`gy${t}`} x1={left} x2={right} y1={toY(t)} y2={toY(t)}
              stroke={isZero(t) ? "#1f2937" : "#e5e7eb"} strokeWidth={isZero(t) ? 2 : 1}
              strokeDasharray="4 4" />
          ))}

          {/* dark frame, under the data line */}
          <rect x={left} y={top} width={right - left} height={bottom - top}
            fill="none" stroke="#6b7280" strokeWidth="2" />

          {/* the data line, "now" band and pins: cut off at the plot edge */}
          <clipPath id={clipId}>
            <rect x={left} y={top} width={right - left} height={bottom - top} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />

            {/* "now" band: see-through orange, 8px wide, dashed edges */}
            {nowX != null && (
              <g>
                <rect x={toX(nowX) - 4} y={top} width="8" height={bottom - top} fill="rgba(245, 158, 11, 0.5)" />
                {[-4, 4].map((d) => (
                  <line key={d} x1={toX(nowX) + d} x2={toX(nowX) + d} y1={top} y2={bottom}
                    stroke="#f59e0b" strokeDasharray="4 4" />
                ))}
              </g>
            )}

            {/* A / B pins: dot, big letter, and a dark label box */}
            {pins.map((p) => (
              <circle key={`dot${p.name}`} cx={toX(p.x)} cy={toY(p.y)} r="5"
                fill="#fff" stroke="#1f2937" strokeWidth="2" />
            ))}
            {placedPins.map((p) => (
              <g key={`label${p.name}`}>
                <text x={p.letterX} y={p.centerY} textAnchor="middle" dominantBaseline="middle"
                  fontSize="16" fontWeight="700" fill="#1f2937">{p.name}</text>
                <rect x={p.boxLeft} y={p.centerY - 13} width={p.boxWidth} height="26" rx="6" fill="#1f2937" />
                <text x={p.boxLeft + p.boxWidth / 2} y={p.centerY} textAnchor="middle"
                  dominantBaseline="middle" fontSize="12" fill="#fff">{p.text}</text>
              </g>
            ))}
          </g>

          {/* tick marks (every chart) and numbers */}
          <g fill="#1f2937" fontSize={fontSize} fontWeight="600">
            {yTicks.map((t) => (
              <g key={`ty${t}`}>
                <line x1={left - TICK} x2={left} y1={toY(t)} y2={toY(t)} stroke="#6b7280" strokeWidth="2" />
                <text x={left - TICK - 4} y={toY(t)} textAnchor="end" dominantBaseline="middle">
                  {t.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <g key={`tx${t}`}>
                <line x1={toX(t)} x2={toX(t)} y1={bottom} y2={bottom + TICK} stroke="#6b7280" strokeWidth="2" />
                {showXNumbers && (
                  <text x={toX(t)} y={bottom + TICK + 2} textAnchor="middle" dominantBaseline="hanging">
                    {t.toLocaleString()}
                  </text>
                )}
              </g>
            ))}
          </g>

          {/* hover: a dot on the point and a dark box with (time, value) */}
          {hover && (() => {
            const text = `(${formatNumber(hover.point.x, 2)}, ${formatNumber(hover.point.y, 2)})`;
            const width = text.length * 7 + 12;
            const boxX = Math.max(left, Math.min(hover.x - width / 2, right - width)); // stay inside the plot
            const boxY = hover.y - 40 >= top ? hover.y - 40 : hover.y + 14; // above, or below if no room
            return (
              <g pointerEvents="none">
                <circle cx={hover.x} cy={hover.y} r="6" fill={color} stroke="#fff" strokeWidth="2" />
                <rect x={boxX} y={boxY} width={width} height="26" rx="6" fill="rgba(0,0,0,0.8)" />
                <text x={boxX + width / 2} y={boxY + 13} textAnchor="middle" dominantBaseline="middle"
                  fontSize="12" fill="#fff">{text}</text>
              </g>
            );
          })()}
        </>
      )}
    </svg>
  );
}

export default SvgChart;
