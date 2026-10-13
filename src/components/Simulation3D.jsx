import { Suspense, useLayoutEffect} from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { useTexture, Text } from "@react-three/drei";
import { niceStep } from "../utils/niceStep";

const EDGE = 10; // half-width of the ruler picture in world units; the picture never changes size
const MIN_RANGE = 10; // meters shown on each side of 0 while the man is near the middle
const MAX_LABELS_PER_SIDE = 6;
const MIN_EDGE_GAP = 0.2; // world units; any closer and the edge stick doubles up with the last stick

const PIN_COLOR = "#1f2937"; // same dark color as the pin dots on the charts
const PIN_POLE_HEIGHT = 1.2; // same as the man, so the pole reaches his head
const PIN_POLE_WIDTH = 0.04;
const PIN_LETTER_SIZE = 0.45;
const PIN_LETTER_GAP = 0.06; // space between the pole and its letter
const PIN_DEPTH = -0.1; // behind the man, so he is not hidden when he walks past

const FIT_HALF_WIDTH = 11; // ruler ±10 plus room for the man sprite and the edge label
const CONTENT_TOP = 1; // just above the man's head
const CONTENT_BOTTOM = -1.25; // just below the ruler labels

// CameraRig makes the ruler fit inside the canvas on any screen size
function CameraRig() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    // Center on the content (it sits below y=0) so the fit doesn't waste height.
    camera.position.y = (CONTENT_TOP + CONTENT_BOTTOM) / 2;
    camera.zoom = Math.min(
      size.width / (2 * FIT_HALF_WIDTH),
      size.height / (CONTENT_TOP - CONTENT_BOTTOM)
    );
    camera.updateProjectionMatrix();
  }, [size.width, size.height, camera]);

  return null;
}

function Simulation3D({ position, velocity, pins = [] }) {
  // The ruler spans -range..range with 0 in the center, and follows the man both ways.
  // Pins count too, so a pin is never off the ruler.
  const range = Math.max(MIN_RANGE, Math.abs(position), ...pins.map((p) => Math.abs(p.position)));
  const step = niceStep(range, MAX_LABELS_PER_SIDE);
  const halfStep = step / 2;
  const toX = (meters) => (meters / range) * EDGE; // sticks, labels and the man all use this

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
      className="w-full h-full bg-blue-50 rounded-lg" // height comes from the parent (App)
    >
      <CameraRig />
      {/* Ground with ruler markings */}
      <group>
        {/* Main ground */}
        <mesh position={[0, -0.6, 0]}>
          <planeGeometry args={[50, 0.1]} />
          <meshBasicMaterial color="skyblue" />
        </mesh>

        {/* Ruler sticks + number labels - one loop, so they can never drift apart */}
        <Suspense fallback={null}>
          {ticks.map(({ value, labeled }) => (
            <group key={`tick-${value}`}>
              <sprite position={[toX(value), -0.7, 0]} scale={[0.02, labeled ? 0.3 : 0.15, 1]}>
                <spriteMaterial color={value === 0 ? "#ff4444" : "#2d5016"} />
              </sprite>
              {labeled && (
                <Text
                  position={[toX(value), -0.9, 0]}
                  fontSize={0.25}
                  color={value === 0 ? "#ff4444" : "#2d5016"}
                  anchorX="center"
                  anchorY="top"
                >
                  {value === 0 ? "0 meters" : value}
                </Text>
              )}
            </group>
          ))}

          {showEdge &&
            [-EDGE, EDGE].map((x) => (
              <sprite key={`edge-${x}`} position={[x, -0.7, 0]} scale={[0.02, 0.3, 1]}>
                <spriteMaterial color="#2d5016" />
              </sprite>
            ))}

          {pins.map((pin, index) => (
            <PinMarker key={pin.name} x={toX(pin.position)} name={pin.name} isFirst={index === 0} />
          ))}
        </Suspense>
      </group>

      <Suspense fallback={null}>
        <HumanSprite position={toX(position)} velocity={velocity} />
      </Suspense>
    </Canvas>
  );
}

// A pin on the ground: a thin pole up to the man's head height, with its big
// letter at the top. The first pin's letter sits left of the pole, the second's
// right, so they don't cover each other when both pins are at the same spot.
function PinMarker({ x, name, isFirst }) {
  return (
    <group position={[x, 0, PIN_DEPTH]}>
      <sprite scale={[PIN_POLE_WIDTH, PIN_POLE_HEIGHT, 1]}>
        <spriteMaterial color={PIN_COLOR} />
      </sprite>
      <Text
        position={[isFirst ? -PIN_LETTER_GAP : PIN_LETTER_GAP, PIN_POLE_HEIGHT / 2, 0]}
        fontSize={PIN_LETTER_SIZE}
        color={PIN_COLOR}
        anchorX={isFirst ? "right" : "left"}
        anchorY="bottom-baseline"
      >
        {name}
      </Text>
    </group>
  );
}

const MOVING_THRESHOLD = 0.1;

function HumanSprite({ position, velocity }) {
  const walkingTexture = useTexture("/walking-man.svg");
  const standingTexture = useTexture("/star.png");

  const isStanding = Math.abs(velocity) <= MOVING_THRESHOLD;
  const texture = isStanding ? standingTexture : walkingTexture;
 //flipping image left to right
  const facing = velocity > 0 ? -1 : 1;          // -1 = mirrored (facing right), 1 = normal (facing left)
  walkingTexture.wrapS = THREE.RepeatWrapping;
  walkingTexture.repeat.x = facing;
  
  return (
    <sprite position={[position, 0, 0]} scale={[1.2, 1.2, 1]}>
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
}
export default Simulation3D;
