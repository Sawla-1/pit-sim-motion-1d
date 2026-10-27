import { Suspense, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { useTexture, Text } from "@react-three/drei";
import { niceStep } from "../utils/niceStep";
import { formatNumber } from "../utils/formatNumber";

const EDGE = 10; // half-width of the ruler picture in world units; the picture never changes size
const MIN_RANGE = 10; // meters shown on each side of 0 while the man is near the middle
const MAX_LABELS_PER_SIDE = 6;
const MIN_EDGE_GAP = 0.2; // world units; any closer and the edge stick doubles up with the last stick
const EDGE_LABEL_GAP = 0.8; // world units; a regular label closer than this to the edge label would overlap it, so it is hidden
const RULER_FONT = "/fonts/Roboto-Bold.woff"; // bold numbers; a font file, because CSS can't style the 3D text

// The ruler look when no `look` is given (the Charts tab): same as before
const DEFAULT_RULER = {
  ground: "skyblue", groundWidth: 50, groundHeight: 0.1, gradient: null, edge: null,
  tick: "#2d5016", tickWidth: 0.02, tickDrop: 0.1, tickHeight: 0.15, tickLabeledHeight: 0.3, labelDrop: 0.3,
  zero: "#ff4444", zeroTick: "#ff4444", label: "#2d5016", outline: null,
  edgeMark: "#1976d2", // the end marks when the ruler grows past 10 m: same blue as the Position chart, so it is not mistaken for a normal ruler number
};

const GROUND_Y = -0.6; // height of the ground line; the man's and the pins' feet stand on it
const MAN_HEIGHT_TALL = 1.7; // Introduction: about 8.5% of the ruler's width, like the mockup
const MAN_HEIGHT_SHORT = 1.2; // Charts: the scene is short, so he is smaller
const MAN_ASPECT = 30 / 44; // the boy art is 30 wide and 44 tall

const PIN_COLOR = "#1f2937"; // same dark color as the pin dots on the charts
const PIN_POLE_WIDTH = 0.04;
const PIN_FLAG_WIDTH = 0.5;
const PIN_FLAG_HEIGHT = 0.36;
const PIN_LETTER_SIZE = 0.3; // fits inside the flag
const PIN_DOT_RADIUS = 0.08; // the dot where the pole meets the ground
const PIN_DEPTH = -0.1; // behind the man, so he is not hidden when he walks past

const FIT_HALF_WIDTH = 11; // ruler ±10 plus room for the man sprite and the edge label
const CONTENT_BOTTOM = -1.25; // just below the ruler labels (when they are LABEL_REFERENCE tall)

const LABEL_BASE = 0.3; // world units: the ruler number size on big screens
const LABEL_MIN_PX = 13; // the ruler numbers are never smaller than this on screen
const LABEL_REFERENCE = 0.25; // the number size that CONTENT_BOTTOM was made for

// How tall a ruler number is, in world units, for a canvas this wide
function labelFontSize(canvasWidth) {
  const pixelsPerUnit = canvasWidth / (2 * FIT_HALF_WIDTH);
  return Math.max(LABEL_BASE, LABEL_MIN_PX / pixelsPerUnit);
}

// A top-to-bottom colour change as a picture, so a flat bar can look round (like bamboo)
function useGradientTexture(colors) {
  return useMemo(() => {
    if (!colors) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [colors]);
}

// CameraRig makes the ruler fit inside the canvas on any screen size
function CameraRig({ manHeight }) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    const contentTop = GROUND_Y + manHeight + PIN_FLAG_HEIGHT; // top of the pin flags (the pole is as tall as the man)
    const contentBottom = CONTENT_BOTTOM - (labelFontSize(size.width) - LABEL_REFERENCE); // room for taller numbers
    // Center on the content (it sits below y=0) so the fit doesn't waste height.
    camera.position.y = (contentTop + contentBottom) / 2;
    camera.zoom = Math.min(
      size.width / (2 * FIT_HALF_WIDTH),
      size.height / (contentTop - contentBottom)
    );
    camera.updateProjectionMatrix();
  }, [size.width, size.height, camera, manHeight]);

  return null;
}

// A ruler number. It reads the canvas width to get its size. On narrow screens
// "0 meters" becomes "0", so it can't run into its neighbours.
function RulerLabel({ text, ...props }) {
  const width = useThree((state) => state.size.width);
  const fontSize = labelFontSize(width);
  return (
    <Text fontSize={fontSize} {...props}>
      {text === "0 meters" && fontSize > LABEL_BASE * 1.5 ? "0" : text}
    </Text>
  );
}

function Simulation3D({ position, velocity, pins = [], tall = false, look = DEFAULT_RULER, onManDragStart, onManDragSample, onManDragEnd }) {
  // The ruler spans -range..range with 0 in the center, and follows the man both ways.
  // Pins count too, so a pin is never off the ruler.
  const manHeight = tall ? MAN_HEIGHT_TALL : MAN_HEIGHT_SHORT;
  const barTexture = useGradientTexture(look.gradient);
  const range = Math.max(MIN_RANGE, Math.abs(position), ...pins.map((p) => Math.abs(p.position)));
  const step = niceStep(range, MAX_LABELS_PER_SIDE);
  const halfStep = step / 2;
  const toX = (meters) => (meters / range) * EDGE; // sticks, labels and the man all use this
  const fromX = (worldX) => (worldX / EDGE) * range; // undoes toX — turns a drag back into meters

  const halfSteps = Math.floor(range / halfStep);//How many halfStep-sized fit 0 to edge
  const ticks = Array.from({ length: halfSteps * 2 + 1 }, (_, i) => {
    const n = i - halfSteps;
    return { value: n * halfStep, labeled: n % 2 === 0 };
  });
  const showEdge = toX(range - halfSteps * halfStep) > MIN_EDGE_GAP;

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 60 }}
      className="w-full h-full rounded-[inherit]" // height comes from the parent (App)
    >
      <CameraRig manHeight={manHeight} />
      {/* Ground with ruler markings */}
      <group>
        {/* Thin dark edge: a slightly bigger bar behind the main one */}
        {look.edge && (
          <mesh position={[0, GROUND_Y, -0.03]}>
            <planeGeometry args={[look.groundWidth + 0.06, look.groundHeight + 0.05]} />
            <meshBasicMaterial color={look.edge} />
          </mesh>
        )}
        {/* Main ground (the joints are in front of it, the edge behind it) */}
        <mesh position={[0, GROUND_Y, -0.02]}>
          <planeGeometry args={[look.groundWidth, look.groundHeight]} />
          <meshBasicMaterial color={barTexture ? "white" : look.ground} map={barTexture} toneMapped={!barTexture} />
        </mesh>

        {/* Ruler sticks + number labels - one loop, so they can never drift apart */}
        <Suspense fallback={null}>
          {ticks.map(({ value, labeled }) => (
            <group key={`tick-${value}`}>
              <sprite position={[toX(value), GROUND_Y - look.tickDrop, 0]} scale={[look.tickWidth, labeled ? look.tickLabeledHeight : look.tickHeight, 1]}>
                <spriteMaterial color={value === 0 ? look.zeroTick : look.tick} />
              </sprite>
              {labeled && !(showEdge && Math.abs(toX(value)) > EDGE - EDGE_LABEL_GAP) && (
                <RulerLabel
                  text={value === 0 ? "0 meters" : String(value)}
                  position={[toX(value), GROUND_Y - look.labelDrop, 0]}
                  font={RULER_FONT}
                  color={value === 0 ? look.zero : look.label}
                  outlineWidth={look.outline ? 0.03 : 0}
                  outlineBlur={look.outline ? 0.005 : 0}
                  outlineColor={look.outline ?? "black"}
                  anchorX="center"
                  anchorY="top"
                />
              )}
            </group>
          ))}

          {showEdge &&
            [-EDGE, EDGE].map((x) => (
              <group key={`edge-${x}`}>
                <sprite position={[x, GROUND_Y - look.tickDrop, 0]} scale={[look.tickWidth, look.tickLabeledHeight, 1]}>
                  <spriteMaterial color={look.edgeMark} />
                </sprite>
                <RulerLabel
                  text={formatNumber((x / EDGE) * range, 1)}
                  position={[x, GROUND_Y - look.labelDrop - 0.05, 0]}
                  font={RULER_FONT}
                  color={look.edgeMark}
                  outlineWidth={look.outline ? 0.03 : 0}
                  outlineBlur={look.outline ? 0.005 : 0}
                  outlineColor={look.outline ?? "black"}
                  anchorX="center"
                  anchorY="top"
                />
              </group>
            ))}

          {pins.map((pin, index) => (
            <PinMarker key={pin.name} x={toX(pin.position)} name={pin.name} isFirst={index === 0} poleHeight={manHeight} />
          ))}
        </Suspense>
      </group>

      <Suspense fallback={null}>
        <HumanSprite  position={toX(position)}
                      height={manHeight}
                      velocity={velocity}
                      onDragStart={onManDragStart}
                      onDragSample={(worldX) => onManDragSample(fromX(worldX))}
                      onDragEnd={onManDragEnd}/>
      </Suspense>
    </Canvas>
  );
}

// A pin on the ground: a dot, a thin pole up to the man's head height, and a
// flag at the top with the letter inside. The first pin's flag points left, the
// second's right, so they don't cover each other when both pins are at the same spot.
function PinMarker({ x, name, isFirst, poleHeight }) {
  const side = isFirst ? -1 : 1;
  const flagX = side * (PIN_POLE_WIDTH / 2 + PIN_FLAG_WIDTH / 2);
  const flagY = poleHeight / 2 + PIN_FLAG_HEIGHT / 2;
  const dotY = -poleHeight / 2;
  const inFrontOfGround = -PIN_DEPTH; // the group sits behind the ground, so the dot steps forward

  return (
    <group position={[x, GROUND_Y + poleHeight / 2, PIN_DEPTH]}>
      <sprite scale={[PIN_POLE_WIDTH, poleHeight, 1]}>
        <spriteMaterial color={PIN_COLOR} />
      </sprite>
      <sprite position={[flagX, flagY, 0]} scale={[PIN_FLAG_WIDTH, PIN_FLAG_HEIGHT, 1]}>
        <spriteMaterial color={PIN_COLOR} />
      </sprite>
      <Text position={[flagX, flagY, 0.01]} fontSize={PIN_LETTER_SIZE} color="white" anchorX="center" anchorY="middle">
        {name}
      </Text>
      {/* Dot like the chart's: dark ring, white middle */}
      <mesh position={[0, dotY, inFrontOfGround + 0.02]}>
        <circleGeometry args={[PIN_DOT_RADIUS, 24]} />
        <meshBasicMaterial color={PIN_COLOR} />
      </mesh>
      <mesh position={[0, dotY, inFrontOfGround + 0.03]}>
        <circleGeometry args={[PIN_DOT_RADIUS * 0.6, 24]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
}

const MOVING_THRESHOLD = 0.1;

function HumanSprite({ position, height, velocity, onDragStart, onDragSample, onDragEnd }) {
  const { camera, gl } = useThree();
  // Mark both pictures as sRGB as soon as they load, so walking and standing get the same colors
  const [walkingTexture, standingTexture] = useTexture(
    ["/karen-intro-svgs/boy-side-walking.svg", "/karen-intro-svgs/boy-standing.svg"],
    (textures) => textures.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; })
  );

  const isStanding = Math.abs(velocity) <= MOVING_THRESHOLD;
  const texture = isStanding ? standingTexture : walkingTexture;

  // Dragging must START on the man (this handler only exists on his sprite),
  // but once started it tracks the mouse anywhere on the page — even over
  // the Charts or Controls panels — same as PhET. That means plain
  // window-level listeners instead of React Three Fiber's canvas-only
  // pointer events, and converting screen pixels to world units ourselves
  // via the camera (unproject), since R3F's own raycasting only works for
  // events that land on the canvas.
  const handlePointerDown = (event) => {
    event.stopPropagation();
    onDragStart();

    const canvasRect = gl.domElement.getBoundingClientRect();

    const handleWindowPointerMove = (moveEvent) => {
      const ndcX = ((moveEvent.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
      const worldX = new THREE.Vector3(ndcX, 0, 0).unproject(camera).x;
      onDragSample(worldX);
    };

    const handleWindowPointerUp = () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      onDragEnd();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  };

  //flipping image left to right
  const facing = velocity > 0 ? 1 : -1;          // 1 = normal (facing right), -1 = mirrored (facing left)
  walkingTexture.wrapS = THREE.RepeatWrapping;
  walkingTexture.repeat.x = facing;

  return (
    <sprite
      position={[position, GROUND_Y + height / 2, 0]}
      scale={[height * MAN_ASPECT, height, 1]}
      onPointerDown={handlePointerDown}
    >
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
}
export default Simulation3D;
