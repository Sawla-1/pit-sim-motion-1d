import { useEffect, useId, useRef, useState } from "react";
import { makeSceneView, makeRulerTicks, labelFontSize, GROUND_Y, EDGE, MIN_RANGE, EDGE_LABEL_GAP, LABEL_BASE, PIN_FLAG_HEIGHT } from "../utils/sceneMath";
import { formatNumber } from "../utils/formatNumber";

const MAN_HEIGHT_TALL = 1.7; // Introduction: about 8.5% of the ruler's width, like the mockup
const MAN_HEIGHT_SHORT = 1.2; // Charts: the scene is short, so he is smaller

// The ruler look when no `look` is given (the Charts tab): same as before
const DEFAULT_RULER = {
  ground: "skyblue", groundWidth: 50, groundHeight: 0.1, gradient: null, edge: null,
  tick: "#2d5016", tickWidth: 0.02, tickDrop: 0.1, tickHeight: 0.15, tickLabeledHeight: 0.3, labelDrop: 0.3,
  zero: "#ff4444", zeroTick: "#ff4444", label: "#2d5016", outline: null,
  edgeMark: "#1976d2", // the end marks when the ruler grows past 10 m: same blue as the Position chart, so it is not mistaken for a normal ruler number
};

// The thin dark edge is a little bigger than the bar, all round (world units)
const EDGE_EXTRA_WIDTH = 0.06;
const EDGE_EXTRA_HEIGHT = 0.05;

const RULER_FONT = '"Ruler Roboto", Roboto, sans-serif'; // bold numbers; the font file is loaded in index.css
const OUTLINE_WIDTH = 0.03; // world units; the dark outline round the numbers (when `look.outline` is set)

const PIN_COLOR = "#1f2937"; // same dark color as the pin dots on the charts
const PIN_POLE_WIDTH = 0.04;
const PIN_FLAG_WIDTH = 0.5;
const PIN_LETTER_SIZE = 0.3; // fits inside the flag
const PIN_DOT_RADIUS = 0.08; // the dot where the pole meets the ground

const MAN_STANDING = "/karen-intro-svgs/boy-standing.svg";
const MAN_WALKING = "/karen-intro-svgs/boy-side-walking.svg"; // the art faces right
const MAN_ASPECT = 30 / 44; // the boy art is 30 wide and 44 tall
const MOVING_THRESHOLD = 0.1; // m/s; at or below this he stands

// The scene (ruler, pins and the man) drawn with SVG. It replaces Simulation3D,
// so it takes the same props:
// position, velocity = the man (meters, meters per second)
// pins = [{ name, position }], tall = Introduction size, look = the ruler colours
// onManDragStart / onManDragSample(meters) / onManDragEnd = the man being dragged
// STEP 7 (the man): the bar, sticks, numbers, pins and the man (no dragging yet). The parts come in step by step.
function SimulationScene(props) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const gradientId = useId(); // each scene needs its own gradient id

  // Keep `size` equal to the real size on screen (needed to turn meters into pixels)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const look = props.look ?? DEFAULT_RULER;
  const manHeight = props.tall ? MAN_HEIGHT_TALL : MAN_HEIGHT_SHORT;
  const ready = size.width > 0 && size.height > 0;
  const view = ready ? makeSceneView(size.width, size.height, manHeight) : null;

  // The ruler spans -range..range with 0 in the center, and follows the man both ways.
  // Pins count too, so a pin is never off the ruler.
  const pins = props.pins ?? [];
  const range = Math.max(MIN_RANGE, Math.abs(props.position), ...pins.map((p) => Math.abs(p.position)));
  const { ticks, showEdge } = makeRulerTicks(range);
  const toWorldX = (meters) => (meters / range) * EDGE; // sticks (and later the labels and the man) use this

  // A stick, centred on its spot just below the ground line (world units → pixels)
  const stickRect = (worldX, height) => ({
    x: view.toX(worldX) - (look.tickWidth * view.zoom) / 2,
    y: view.toY(GROUND_Y - look.tickDrop) - (height * view.zoom) / 2,
    width: look.tickWidth * view.zoom,
    height: height * view.zoom,
  });

  // A ruler number hanging from `drop` below the ground line. The size is in world units,
  // so on narrow screens it grows to stay readable (see labelFontSize).
  // paint-order draws the outline first, so only its outer half shows.
  const labelSize = labelFontSize(size.width);
  const rulerText = (key, worldX, drop, text, color) => (
    <text
      key={key}
      x={view.toX(worldX)}
      y={view.toY(GROUND_Y - drop)}
      fontSize={labelSize * view.zoom}
      fill={color}
      stroke={look.outline ?? "none"}
      strokeWidth={look.outline ? 2 * OUTLINE_WIDTH * view.zoom : 0}
      strokeLinejoin="round"
      paintOrder="stroke"
      textAnchor="middle"
      dominantBaseline="hanging"
    >
      {text}
    </text>
  );
  // On narrow screens "0 meters" becomes "0", so it can't run into its neighbours
  const zeroText = labelSize > LABEL_BASE * 1.5 ? "0" : "0 meters";

  // Where a pin stands (world units). The first pin's flag points left, the second's
  // right, so they don't cover each other when both pins are at the same spot.
  const pinSpot = (pin, index) => {
    const x = toWorldX(pin.position);
    const side = index === 0 ? -1 : 1;
    return { x, flagX: x + side * (PIN_POLE_WIDTH / 2 + PIN_FLAG_WIDTH / 2) };
  };

  // The man: his feet stand on the ground line and his middle is over his position.
  // He stands when he is (nearly) still and walks when he moves. Both pictures are always
  // in the page and only one is shown, so switching never waits for a download.
  // Only the walking picture turns: he walks left when his speed is 0 or less (the art faces right).
  const manWidth = manHeight * MAN_ASPECT;
  const isStanding = Math.abs(props.velocity) <= MOVING_THRESHOLD;
  const manPicture = (href, show, turned) => {
    const centerX = view.toX(toWorldX(props.position));
    return (
      <g transform={turned ? `translate(${2 * centerX} 0) scale(-1 1)` : undefined}>
        <image
          href={href}
          x={centerX - (manWidth * view.zoom) / 2}
          y={view.toY(GROUND_Y + manHeight)}
          width={manWidth * view.zoom}
          height={manHeight * view.zoom}
          preserveAspectRatio="none"
          visibility={show ? "visible" : "hidden"}
        />
      </g>
    );
  };

  return (
    <svg ref={ref} width="100%" height="100%" className="block rounded-[inherit]">
      {view && (
        <g>
          {/* A top-to-bottom colour change, so a flat bar can look round (like bamboo) */}
          {look.gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                {look.gradient.map((color, i) => (
                  <stop key={i} offset={i / (look.gradient.length - 1)} stopColor={color} />
                ))}
              </linearGradient>
            </defs>
          )}
          {/* Pins, behind the bar (so the pole's foot is hidden by it): a pole up to the man's
              head height, and a flag on top of it. The dots come later. */}
          {pins.map((pin, index) => {
            const { x, flagX } = pinSpot(pin, index);
            const poleTop = GROUND_Y + manHeight;
            return (
              <g key={pin.name}>
                <rect x={view.toX(x - PIN_POLE_WIDTH / 2)} y={view.toY(poleTop)} width={PIN_POLE_WIDTH * view.zoom} height={manHeight * view.zoom} fill={PIN_COLOR} />
                <rect x={view.toX(flagX - PIN_FLAG_WIDTH / 2)} y={view.toY(poleTop + PIN_FLAG_HEIGHT)} width={PIN_FLAG_WIDTH * view.zoom} height={PIN_FLAG_HEIGHT * view.zoom} fill={PIN_COLOR} />
              </g>
            );
          })}
          {/* The letters come after ALL the flags, so when two pins are close a flag
              never covers the other pin's letter (same as the old scene) */}
          {pins.map((pin, index) => (
            <text
              key={`letter-${pin.name}`}
              x={view.toX(pinSpot(pin, index).flagX)}
              y={view.toY(GROUND_Y + manHeight + PIN_FLAG_HEIGHT / 2)}
              fontSize={PIN_LETTER_SIZE * view.zoom}
              fill="white"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {pin.name}
            </text>
          ))}

          {/* Thin dark edge: a slightly bigger bar behind the main one */}
          {look.edge && (
            <rect
              x={view.toX(-(look.groundWidth + EDGE_EXTRA_WIDTH) / 2)}
              y={view.toY(GROUND_Y + (look.groundHeight + EDGE_EXTRA_HEIGHT) / 2)}
              width={(look.groundWidth + EDGE_EXTRA_WIDTH) * view.zoom}
              height={(look.groundHeight + EDGE_EXTRA_HEIGHT) * view.zoom}
              fill={look.edge}
            />
          )}
          {/* Main ground bar: its middle is at world (0, GROUND_Y) */}
          <rect
            x={view.toX(-look.groundWidth / 2)}
            y={view.toY(GROUND_Y + look.groundHeight / 2)}
            width={look.groundWidth * view.zoom}
            height={look.groundHeight * view.zoom}
            fill={look.gradient ? `url(#${gradientId})` : look.ground}
          />

          {/* Ruler sticks: the 0 stick is red; the long ones will get a number (step 5) */}
          {ticks.map(({ value, labeled }) => (
            <rect
              key={`tick-${value}`}
              {...stickRect(toWorldX(value), labeled ? look.tickLabeledHeight : look.tickHeight)}
              fill={value === 0 ? look.zeroTick : look.tick}
            />
          ))}

          {/* End marks when the ruler grows past 10 m */}
          {showEdge &&
            [-EDGE, EDGE].map((x) => (
              <rect key={`edge-${x}`} {...stickRect(x, look.tickLabeledHeight)} fill={look.edgeMark} />
            ))}

          {/* Ruler numbers: under the long sticks. A number too close to an end mark is hidden. */}
          <g fontFamily={RULER_FONT} fontWeight="700">
            {ticks.map(({ value, labeled }) =>
              labeled && !(showEdge && Math.abs(toWorldX(value)) > EDGE - EDGE_LABEL_GAP)
                ? rulerText(`label-${value}`, toWorldX(value), look.labelDrop, value === 0 ? zeroText : String(value), value === 0 ? look.zero : look.label)
                : null
            )}
            {showEdge &&
              [-EDGE, EDGE].map((x) =>
                rulerText(`edge-label-${x}`, x, look.labelDrop + 0.05, formatNumber((x / EDGE) * range, 1), look.edgeMark)
              )}
          </g>

          {/* The man, in front of the bar and the numbers (the pins' poles are behind him) */}
          {manPicture(MAN_STANDING, isStanding, false)}
          {manPicture(MAN_WALKING, !isStanding, props.velocity <= 0)}

          {/* The pins' dots on the ground, in front of the bar: dark ring, white middle (like the chart's) */}
          {pins.map((pin) => {
            const cx = view.toX(toWorldX(pin.position));
            const cy = view.toY(GROUND_Y);
            return (
              <g key={`dot-${pin.name}`}>
                <circle cx={cx} cy={cy} r={PIN_DOT_RADIUS * view.zoom} fill={PIN_COLOR} />
                <circle cx={cx} cy={cy} r={PIN_DOT_RADIUS * 0.6 * view.zoom} fill="white" />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

export default SimulationScene;
