import { useEffect, useId, useRef, useState } from "react";
import { makeSceneView, makeRulerTicks, GROUND_Y, EDGE, MIN_RANGE } from "../utils/sceneMath";

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

// The scene (ruler, pins and the man) drawn with SVG. It replaces Simulation3D,
// so it takes the same props:
// position, velocity = the man (meters, meters per second)
// pins = [{ name, position }], tall = Introduction size, look = the ruler colours
// onManDragStart / onManDragSample(meters) / onManDragEnd = the man being dragged
// STEP 4 (ruler sticks): the bar and its sticks. The parts come in step by step.
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
        </g>
      )}
    </svg>
  );
}

export default SimulationScene;
