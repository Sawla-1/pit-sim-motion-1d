import { useEffect, useId, useRef, useState } from "react";
import { makeSceneView, makeBackdropView, makeRulerTicks, isCompactRuler, rulerZoom, GROUND_Y, EDGE, MIN_RANGE, EDGE_LABEL_GAP, LABEL_BASE, PIN_FLAG_HEIGHT } from "../utils/sceneMath";
import { formatNumber } from "../utils/formatNumber";
import { KAREN_ART } from "../styles/karenStyles";
import { SERIES_COLORS } from "../styles/seriesColors";

const MAN_HEIGHT_TALL = 1.7; // Introduction: about 8.5% of the ruler's width, like the mockup
const MAN_HEIGHT_SHORT = 1.2; // Charts: the scene is short, so he is smaller
// The phone look (phones and tablets: the CSS sets --phone-look; or any ruler under 450px): the man
// is 2.5 times bigger (Introduction 3.75 times), the ruler 2 times thicker, the numbers 2 times bigger
// (16 to 21px), the pins 2 times bigger, and a number only every 5 m, so all are easy to see. On
// Charts the man is as tall as a whole pin (pole and flag), and the ruler sits at the bottom of its
// scene (the tabs and the time box are in a strip above it).
// The ruler always keeps its size: if the man and the pins don't fit above it, they get smaller.
const MAN_SCALE_BIG = 2.5; // Charts (and the man there grows to the top of the pin flag)
const MAN_SCALE_BIG_TALL = 3.75; // Introduction: 1.5 times more, its scene has room
const RULER_SCALE_BIG = 2;
const LABEL_MIN_PX_BIG = 16;
const LABEL_MAX_PX_BIG = 21; // the numbers stop growing at the iPad mini size
const MAN_MAX_PX = 195; // the phone look on big tablets: the man is never taller than this on screen

// The ruler look when no `look` is given (the Charts tab)
const DEFAULT_RULER = {
  ground: "skyblue", groundWidth: 50, groundHeight: 0.1, gradient: null, edge: null,
  tick: "#2d5016", tickWidth: 0.02, tickDrop: 0.1, tickHeight: 0.15, tickLabeledHeight: 0.3, labelDrop: 0.3,
  zero: "#ff4444", zeroTick: "#ff4444", label: "#2d5016", outline: null,
  edgeMark: SERIES_COLORS.position.color, // the end marks when the ruler grows past 10 m: same blue as the Position chart, so it is not mistaken for a normal ruler number
};

// The thin dark edge is a little bigger than the bar, all round (world units)
const EDGE_EXTRA_WIDTH = 0.06;
const EDGE_EXTRA_HEIGHT = 0.05;

const RULER_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; // the device's own font; no font file to load
const OUTLINE_WIDTH = 0.03; // world units; the dark outline round the numbers (when `look.outline` is set)

const PIN_COLOR = "#1f2937"; // same dark color as the pin dots on the charts
const PIN_POLE_WIDTH = 0.04;
const PIN_FLAG_WIDTH = 0.5;
const PIN_LETTER_SIZE = 0.3; // fits inside the flag
const PIN_DOT_RADIUS = 0.08; // the dot where the pole meets the ground
const PIN_SCALE_BIG = 2; // a short ruler: the flag, letter, pole and dot are 2 times bigger (see MAN_SCALE_BIG)

const MAN_ASPECT = 30 / 44; // the boy art is 30 wide and 44 tall
const MOVING_THRESHOLD = 0.1; // m/s; at or below this he stands

// The velocity and acceleration arrows lie on the ruler and start at the man's feet, one over the
// other. You can see through them, so both arrows and the ruler still show where they overlap.
// Sizes are in world units, so they follow the ruler: 1 m/s (or 1 m/s²) is ARROW_LENGTH long
// (10 is 40% of the ruler). With the phone look they are 2 times thicker, like the ruler.
const ARROW_LENGTH = 0.8;
const ARROW_LINE = 0.3; // how thick the line is
const ARROW_TIP = 0.6; // how long and how wide the tip is
const ARROW_SEE_THROUGH = 0.75; // fill opacity: 1 = solid
const ARROW_OUTLINE = "#1f2937"; // thin dark edge, the same dark as the pins
const ARROW_MIN_PX = 30; // the shortest arrow on screen (pixels), so a small value still shows its way
const ARROW_ZERO = 0.005; // below this the number box shows 0 (2 decimals), so there is no arrow

// How far the lowest part of the ruler (the bar or a long stick) reaches below the ground line
const rulerLowest = (look) => Math.max(look.groundHeight / 2, look.tickDrop + look.tickLabeledHeight / 2);

// The same ruler look with the sticks across the line (like the bamboo joints) instead of hanging
// below it: the numbers move up by as much as the sticks did
function sticksAcrossLine(look) {
  const across = { ...look, tickDrop: 0 };
  return { ...across, labelDrop: look.labelDrop + rulerLowest(across) - rulerLowest(look) };
}

// The same ruler look, `scale` times thicker: the bar and the sticks grow, and the numbers move
// down by as much as the lowest part did, so they keep the same gap
function thickerRuler(look, scale) {
  const thick = {
    ...look,
    groundHeight: look.groundHeight * scale,
    tickHeight: look.tickHeight * scale,
    tickLabeledHeight: look.tickLabeledHeight * scale,
    tickDrop: look.tickDrop * scale,
  };
  return { ...thick, labelDrop: look.labelDrop + rulerLowest(thick) - rulerLowest(look) };
}

// Phones: a finger that starts on the man must drag him, not scroll the page (only while he can
// be dragged; in Playback a swipe on him scrolls the page as anywhere else). Chrome ignores
// `touch-action` on parts of an SVG, so the scroll is stopped in touchstart. It must be a real
// listener with { passive: false } (React's touch handlers can't stop scrolling), and it sits
// only on the man, so swipes elsewhere stay smooth. Used as a ref; returns its cleanup (React 19).
function stopScrollOnTouch(element) {
  const stop = (event) => {
    if (event.cancelable) event.preventDefault();
  };
  element.addEventListener("touchstart", stop, { passive: false });
  return () => element.removeEventListener("touchstart", stop);
}

// The scene (ruler, pins and the man) drawn with SVG. Props:
// position, velocity, acceleration = the man (meters, meters per second, meters per second²)
// arrows = { velocity, acceleration }: which arrows to show at his feet (true = shown)
// pins = [{ name, position }], tall = Introduction size, look = the ruler colours
// backdrop = the picture behind the scene, so the ground stands on it (see makeBackdropView)
// canDrag = the man can be dragged (Record). Playback only looks, so a press on him does nothing.
// onManDragStart / onManDragSample(meters) / onManDragEnd = the man being dragged
function SimulationScene({ position, velocity, acceleration, arrows, pins = [], tall, look: baseLook = DEFAULT_RULER, backdrop, canDrag, onManDragStart, onManDragSample, onManDragEnd }) {
  const ref = useRef(null);
  const drag = useRef(null); // while dragging: the scale from the moment of the press; null = not dragging
  const [size, setSize] = useState({ width: 0, height: 0, side: 0, manScale: 0, groundAtBottom: false, phoneLook: false, numbersLikeCharts: false, manPinsScale: 1, uprightRuler: 0, fillRoom: false });
  const gradientId = useId(); // each scene needs its own gradient id

  // Keep `size` equal to the real size on screen (needed to turn meters into pixels).
  // side = room to keep free at the left and right: the CSS variable --side (0 if it is not set).
  // manScale = how much bigger to draw the man: the CSS variable --man-scale (0 if it is not set: the
  // look decides). phoneLook = the CSS variable --phone-look is 1: the phone look on any ruler.
  // numbersLikeCharts = the CSS variable --numbers-like-charts is 1 (see makeBackdropView).
  // manPinsScale = how big to draw the man and the pins, after they fit: the CSS variable --man-pins-scale (1 if it is not set).
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const css = getComputedStyle(entry.target);
      const number = (name, unset) => parseFloat(css.getPropertyValue(name)) || unset; // a CSS number (`unset` if not set)
      const isOn = (name) => css.getPropertyValue(name).trim() === "1"; // a CSS switch: 1 = on
      // the ruler's width with this phone held upright: the screen's short side minus the sides (0 = not set)
      const uprightSide = parseFloat(css.getPropertyValue("--upright-side"));
      setSize({
        width: entry.contentRect.width, height: entry.contentRect.height,
        side: number("--side", 0), manScale: number("--man-scale", 0), manPinsScale: number("--man-pins-scale", 1),
        groundAtBottom: isOn("--ground-at-bottom"), phoneLook: isOn("--phone-look"), numbersLikeCharts: isOn("--numbers-like-charts"),
        uprightRuler: isNaN(uprightSide) ? 0 : Math.min(window.screen.width, window.screen.height) - 2 * uprightSide,
        fillRoom: isOn("--fill-room"), // see fitScale
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const rulerWidth = size.width - 2 * size.side;
  const compact = isCompactRuler(rulerWidth) || size.phoneLook; // the phone look (see MAN_SCALE_BIG)
  const normalMan = tall ? MAN_HEIGHT_TALL : MAN_HEIGHT_SHORT;
  const bigScale = tall ? MAN_SCALE_BIG_TALL : MAN_SCALE_BIG;
  // The man and the pins as big as we would like them. The pin pole is as tall as the man would be
  // (the CSS may set his size: --man-scale), with the flag on top.
  const wantPole = normalMan * (size.manScale || (compact ? bigScale : 1));
  const wantPinScale = compact ? PIN_SCALE_BIG : 1;
  const wantPins = wantPole + PIN_FLAG_HEIGHT * wantPinScale; // a whole pin: pole and flag
  const wantMan = compact && !tall ? wantPins : wantPole; // Charts with the phone look: as tall as a whole pin
  const look = compact ? thickerRuler(sticksAcrossLine(baseLook), RULER_SCALE_BIG) : baseLook;
  const fit = {
    labelMinPx: compact ? LABEL_MIN_PX_BIG : undefined,
    labelMaxPx: compact ? LABEL_MAX_PX_BIG : undefined,
    labelBase: LABEL_BASE * (compact ? RULER_SCALE_BIG : 1), // a thicker ruler has bigger numbers
    extraBottom: look.labelDrop - baseLook.labelDrop, // the numbers hang lower under a thicker ruler
  };
  // The view makes room for the man and the pins at their normal size, so the ruler keeps its size.
  // manWidth = the man's width: a wide man still fits at the ruler's ends.
  const ready = size.width > 0 && size.height > 0;
  const viewFor = (manWidth) => !ready ? null
    : backdrop ? makeBackdropView(size.width, size.height, { ...fit, manWidth, manHeight: normalMan, backdrop, side: size.side, numbersLikeCharts: size.numbersLikeCharts, alignBottom: size.groundAtBottom })
    : makeSceneView(size.width, size.height, normalMan, { ...fit, manWidth, alignBottom: compact });
  // The man and the pins get smaller together if they don't fit above the ruler. With the phone look
  // the man is also never taller than MAN_MAX_PX (big tablets). Last, the CSS may make both smaller
  // (--man-pins-scale: 1024px tablets turned sideways, Introduction); the ruler keeps its size.
  // Phones turned sideways (--upright-side): the man is never taller than with the phone held upright
  // (the same look, on a ruler as wide as the screen's short side).
  const uprightMan = normalMan * bigScale;
  const uprightPx = size.uprightRuler ? uprightMan * rulerZoom(size.uprightRuler, uprightMan * MAN_ASPECT) : Infinity;
  // --fill-room (tablets held upright, Charts): they may also grow, to fill the room above the ruler.
  const fitScaleIn = (viewToTry) => size.manPinsScale * (!viewToTry ? 1 : Math.min(
    size.fillRoom ? Infinity : 1,
    viewToTry.roomAbove / wantPins,
    compact ? MAN_MAX_PX / (wantMan * viewToTry.zoom) : 1,
    uprightPx / (wantMan * viewToTry.zoom),
  ));
  let view = viewFor(wantMan * MAN_ASPECT);
  let fitScale = fitScaleIn(view);
  // --fill-room: a man who grew is wider too, so make the view again with room for his new width
  if (fitScale > 1) {
    view = viewFor(wantMan * fitScale * MAN_ASPECT);
    fitScale = fitScaleIn(view);
  }
  const poleHeight = wantPole * fitScale;
  const manHeight = wantMan * fitScale;
  const manWidth = manHeight * MAN_ASPECT;
  const pinScale = wantPinScale * fitScale;
  const flagWidth = PIN_FLAG_WIDTH * pinScale;
  const flagHeight = PIN_FLAG_HEIGHT * pinScale; // the pin flags stand on top of the poles
  const poleWidth = PIN_POLE_WIDTH * pinScale;

  // The ruler spans -range..range with 0 in the center, and follows the man both ways.
  // Pins count too, so a pin is never off the ruler.
  const range = Math.max(MIN_RANGE, Math.abs(position), ...pins.map((p) => Math.abs(p.position)));
  const { ticks, showEdge } = makeRulerTicks(range, compact);
  const toWorldX = (meters) => (meters / range) * EDGE; // sticks, labels, pins and the man all use this

  // A stick, centred on its spot just below the ground line (world units → pixels)
  const stickRect = (worldX, height) => ({
    x: view.toX(worldX) - (look.tickWidth * view.zoom) / 2,
    y: view.toY(GROUND_Y - look.tickDrop) - (height * view.zoom) / 2,
    width: look.tickWidth * view.zoom,
    height: height * view.zoom,
  });

  // A ruler number hanging from `drop` below the ground line. The size is in world units,
  // so on narrow screens it grows to stay readable (the view picks it).
  // paint-order draws the outline first, so only its outer half shows.
  const labelSize = view?.labelSize ?? LABEL_BASE;
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
    return { x, flagX: x + side * (poleWidth / 2 + flagWidth / 2) };
  };

  // The man: his feet stand on the ground line and his middle is over his position.
  // He stands when he is (nearly) still and walks when he moves. Both pictures are always
  // in the page and only one is shown, so switching never waits for a download.
  // Only the walking picture turns: he walks left when his speed is 0 or less (the art faces right).
  const isStanding = Math.abs(velocity) <= MOVING_THRESHOLD;
  // Dragging must START on the man (the handlers are only on his pictures), but once started it
  // follows the mouse or finger anywhere on the page, even over the charts or the controls, same
  // as PhET: pointer capture sends all of that pointer's moves to the man (like SvgChart does).
  // Where a pointer is, in world units from the middle of the scene: its distance in
  // pixels divided by the scale (pixels per world unit)
  const pointerWorldX = (clientX, zoom) => {
    const sceneRect = ref.current.getBoundingClientRect(); // read now, so a page scroll mid-drag is fine
    return (clientX - sceneRect.left - sceneRect.width / 2) / zoom;
  };

  const handleManPointerDown = (event) => {
    if (!canDrag) return; // Playback: a press does nothing (and doesn't pause it)
    event.stopPropagation();
    event.preventDefault(); // stops the browser from selecting text while the mouse drags over the page
    if (drag.current || event.button !== 0) return; // already dragging (a second finger), or not the main button
    // Keep the scale from the moment of the press: the ruler grows while he walks past 10 m,
    // and the new scale would make him run away from the mouse.
    // grabX = where on him you grabbed (world units from his middle), so he doesn't jump to the pointer.
    drag.current = { zoom: view.zoom, range, grabX: pointerWorldX(event.clientX, view.zoom) - toWorldX(position) };
    event.currentTarget.setPointerCapture(event.pointerId);
    onManDragStart();
  };

  // Pointer → meters: his middle is grabX away from the pointer; world units over EDGE, times the range, is meters
  const handleManPointerMove = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; // only the finger or mouse that grabbed him
    const worldX = pointerWorldX(event.clientX, drag.current.zoom) - drag.current.grabX;
    onManDragSample((worldX / EDGE) * drag.current.range);
  };

  // Let go (pointerup), or the browser took the pointer away (pointercancel): the capture ends either way
  const handleManLostCapture = () => {
    drag.current = null;
    onManDragEnd();
  };

  const manPicture = (href, show, turned) => {
    const centerX = view.toX(toWorldX(position));
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

  // One arrow on the ruler: it starts at the man's feet and points right for + and left for -.
  // No arrow when the number box shows 0. A small value still gets a short arrow (ARROW_MIN_PX),
  // so its way shows. A short arrow gets a smaller tip (at most half its length), so it still looks
  // like an arrow. Drawn as one shape: along the line, round the tip, and back along the line.
  const arrow = (value, color) => {
    if (Math.abs(value) < ARROW_ZERO) return null;
    const direction = Math.sign(value);
    const startX = toWorldX(position);
    const length = Math.max(Math.abs(value) * ARROW_LENGTH, ARROW_MIN_PX / view.zoom); // world units
    const tipX = startX + direction * length;
    const thick = compact ? RULER_SCALE_BIG : 1; // the phone look: 2 times thicker, like the ruler
    const tip = Math.min(ARROW_TIP * thick, Math.abs(tipX - startX) / 2); // the tip is as wide as it is long
    const neckX = tipX - direction * tip; // where the line meets the tip
    const line = Math.min(ARROW_LINE * thick, tip / 2) / 2; // half the line's thickness
    const half = tip / 2; // half the tip's width
    const y = GROUND_Y;
    const corners = [
      [startX, y + line], [neckX, y + line], [neckX, y + half], [tipX, y],
      [neckX, y - half], [neckX, y - line], [startX, y - line],
    ];
    return (
      <polygon
        points={corners.map(([x, cornerY]) => `${view.toX(x)},${view.toY(cornerY)}`).join(" ")}
        fill={color}
        fillOpacity={ARROW_SEE_THROUGH}
        stroke={ARROW_OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    );
  };

  return (
    <svg ref={ref} width="100%" height="100%" className="block rounded-[inherit] select-none">
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
          {/* Pins, behind the bar (so the pole's foot is hidden by it): a pole (as tall as the man,
              or with the phone look on Charts up to the man's shoulders), and a flag on top of it.
              The dots come later. */}
          {pins.map((pin, index) => {
            const { x, flagX } = pinSpot(pin, index);
            const poleTop = GROUND_Y + poleHeight;
            return (
              <g key={pin.name}>
                <rect x={view.toX(x - poleWidth / 2)} y={view.toY(poleTop)} width={poleWidth * view.zoom} height={poleHeight * view.zoom} fill={PIN_COLOR} />
                <rect x={view.toX(flagX - flagWidth / 2)} y={view.toY(poleTop + flagHeight)} width={flagWidth * view.zoom} height={flagHeight * view.zoom} fill={PIN_COLOR} />
              </g>
            );
          })}
          {/* The letters come after ALL the flags, so when two pins are close a flag
              never covers the other pin's letter */}
          {pins.map((pin, index) => (
            <text
              key={`letter-${pin.name}`}
              x={view.toX(pinSpot(pin, index).flagX)}
              y={view.toY(GROUND_Y + poleHeight + flagHeight / 2)}
              fontSize={PIN_LETTER_SIZE * pinScale * view.zoom}
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

          {/* Ruler sticks: the 0 stick is red; the long ones have a number under them */}
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
          {/* touch-action for browsers that honor it on SVG; stopScrollOnTouch for Chrome.
              Playback (canDrag false): neither, so a swipe on him scrolls the page.
              The move and let-go handlers stay on always: a drag that began in Record and is
              still going when Playback is tapped (a second finger) must still end here. */}
          <g
            ref={canDrag ? stopScrollOnTouch : undefined}
            style={{ touchAction: canDrag ? "none" : undefined }}
            onPointerDown={handleManPointerDown}
            onPointerMove={handleManPointerMove}
            onLostPointerCapture={handleManLostCapture}
          >
            {manPicture(KAREN_ART.boyStanding, isStanding, false)}
            {manPicture(KAREN_ART.boyWalking, !isStanding, velocity <= 0)}
          </g>

          {/* The arrows at his feet, in front of him (a big man on a phone would hide a short arrow):
              velocity, then acceleration over it. A press goes through them to the man. */}
          <g pointerEvents="none">
            {arrows?.velocity && arrow(velocity, SERIES_COLORS.velocity.color)}
            {arrows?.acceleration && arrow(acceleration, SERIES_COLORS.acceleration.color)}
          </g>

          {/* The pins' dots on the ground, in front of the bar: dark ring, white middle (like the chart's) */}
          {pins.map((pin) => {
            const cx = view.toX(toWorldX(pin.position));
            const cy = view.toY(GROUND_Y);
            return (
              <g key={`dot-${pin.name}`}>
                <circle cx={cx} cy={cy} r={PIN_DOT_RADIUS * pinScale * view.zoom} fill={PIN_COLOR} />
                <circle cx={cx} cy={cy} r={PIN_DOT_RADIUS * 0.6 * pinScale * view.zoom} fill="white" />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

export default SimulationScene;
