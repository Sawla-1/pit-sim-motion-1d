import { Suspense, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { useTexture, Text } from "@react-three/drei";
import { formatNumber } from "../utils/formatNumber";

const EDGE = 10; // ruler half-width in meters; the ruler itself never changes size
const FIT_HALF_WIDTH = 11; // ruler ±10 plus room for the man sprite and the edge label
const CONTENT_TOP = 0.7; // just above the man's head
const CONTENT_BOTTOM = -1.25; // just below the ruler labels

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

function Simulation3D({ position, velocity }) {
  // Past ±EDGE the man stays at the edge and that side's labels stretch,
  // so the edge label always equals the current position.
  const rightScale = Math.max(1, position / EDGE);
  const leftScale = Math.max(1, -position / EDGE);
  const displayX = position / (position >= 0 ? rightScale : leftScale);

  const labelFor = (i) => {
    if (i === 0) return "0 meters";
    const sideScale = i > 0 ? rightScale : leftScale;
    return sideScale === 1 ? i : formatNumber(i * sideScale, 0);
  };

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 60 }}
      className="w-full h-[125px] bg-blue-50 rounded-lg"
    >
      <CameraRig />
      <ambientLight intensity={1} />

      {/* Ground with ruler markings */}
      <group>
        {/* Main ground */}
        <mesh position={[0, -0.6, 0]}>
          <planeGeometry args={[50, 0.1]} />
          <meshBasicMaterial color="skyblue" />
        </mesh>

        {/* Ruler ticks + number labels - one loop, so they can never drift apart */}
        <Suspense fallback={null}>
          {Array.from({ length: 21}, (_, i) => i - 10).map(
            (i) => (
              <group key={`marker-${i}`}>
                <sprite position={[i, -0.7, 0]} scale={[0.02, i % 2 === 0 ? 0.3 : 0.15, 1]}>
                  <spriteMaterial color={i === 0 ? "#ff4444" : "#2d5016"} />
                </sprite>
                {i % 2 === 0 && (
                  <Text
                    position={[i, -0.95, 0]}
                    fontSize={0.25}
                    color={i === 0 ? "#ff4444" : "#2d5016"}
                    anchorX="center"
                    anchorY="top"
                  >
                    {labelFor(i)}
                  </Text>
                )}
              </group>
            )
          )}
        </Suspense>
      </group>

      <Suspense fallback={null}>
        <HumanSprite position={displayX} velocity={velocity} />
      </Suspense>
    </Canvas>
  );
}

const MOVING_THRESHOLD = 0.1;

function HumanSprite({ position, velocity }) {
  const walkingTexture = useTexture("/walking-man.svg");
  const standingTexture = useTexture("/star.png");
  const facingRef = useRef(-1);

  if (velocity > MOVING_THRESHOLD) facingRef.current = -1;
  else if (velocity < -MOVING_THRESHOLD) facingRef.current = 1;

  const isStanding = Math.abs(velocity) <= MOVING_THRESHOLD;
  const texture = isStanding ? standingTexture : walkingTexture;

  // Sprite ignores scale's sign, so mirror by flipping the texture's UVs instead.
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = facingRef.current;          // 1 = normal, -1 = mirrored
  texture.offset.x = facingRef.current === -1 ? 1 : 0;

  return (
    <sprite position={[position, 0, 0]} scale={[1.2, 1.2, 1]}>
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
}
export default Simulation3D;

