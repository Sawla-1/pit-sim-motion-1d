import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas} from "@react-three/fiber";
import { useTexture, Text } from "@react-three/drei";


function Simulation3D({ position, velocity }) {

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 60 }}
      className="w-full h-[125px] bg-blue-50 rounded-lg"
    >
      {/* <CameraRig halfWidth={rulerHalfWidth} /> */}
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
                    {i === 0 ? "0 meters" : i}
                  </Text>
                )}
              </group>
            )
          )}
        </Suspense>
      </group>

      <Suspense fallback={null}>
        <HumanSprite position={position} velocity={velocity} />
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

