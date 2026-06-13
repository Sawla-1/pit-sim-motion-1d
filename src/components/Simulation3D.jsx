import { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";

/**
 * 3D Simulation Component - Combines Sprite, Ground, and Simulation logic
 * Much simpler than the original separate components
 */
function Simulation3D({ simulation, onSimulationStep }) {
  const last = useRef(performance.now());
  const realTimeStart = useRef(null); // Will be set when play button is pressed
  const pauseStartTime = useRef(null); // Track when pause started

  // Reset realTimeStart when simulation time is reset to 0
  useEffect(() => {
    if (simulation.time === 0) {
      realTimeStart.current = null;
      pauseStartTime.current = null;
    }
  }, [simulation.time]);

  // Track pause/resume to adjust timing
  useEffect(() => {
    if (simulation.playing) {
      // Resuming from pause - adjust realTimeStart to account for pause duration
      if (pauseStartTime.current !== null && realTimeStart.current !== null) {
        const pauseDuration =
          (performance.now() - pauseStartTime.current) / 1000;
        realTimeStart.current += pauseDuration * 1000; // Add pause time to start time
        pauseStartTime.current = null;
      }
    } else {
      // Pausing - record when pause started
      if (realTimeStart.current !== null) {
        pauseStartTime.current = performance.now();
      }
    }
  }, [simulation.playing]);

  // Fixed timestep animation loop with frame accumulation for consistent physics
  useEffect(() => {
    let raf;
    let accumulator = 0;
    const FIXED_TIMESTEP = 1 / 24; // 24 FPS physics for consistent behavior

    function loop(now) {
      const frameTime = (now - last.current) / 1000; // Remove clamping for real-world timing
      last.current = now;

      if (simulation.playing) {
        // Set start time when play button is first pressed
        if (realTimeStart.current === null) {
          realTimeStart.current = now;
        }

        // Calculate real elapsed time for display purposes
        const realElapsedTime = (now - realTimeStart.current) / 1000;

        // Frame accumulation: run multiple physics steps if needed
        accumulator += frameTime;
        while (accumulator >= FIXED_TIMESTEP) {
          onSimulationStep(FIXED_TIMESTEP, realElapsedTime); // Pass real time for display
          accumulator -= FIXED_TIMESTEP;
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [simulation.playing, onSimulationStep]);

  return (
    <div className="relative">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 10], zoom: 60 }}
        className="w-full h-[125px] bg-blue-50 rounded-lg"
      >
        <ambientLight intensity={1} />

        {/* Ground with ruler markings */}
        <group>
          {/* Main ground */}
          <mesh position={[0, -0.6, 0]}>
            <planeGeometry args={[50, 0.1]} />
            <meshBasicMaterial color="skyblue" />
          </mesh>

          {/* Ruler markings - simplified */}
          {Array.from({ length: 21 }, (_, i) => i - 10).map((i) =>
            i % 2 === 0 ? (
              <sprite
                key={`marker-${i}`}
                position={[i, -0.7, 0]}
                scale={[0.02, 0.3, 1]}
              >
                <spriteMaterial color="#2d5016" />
              </sprite>
            ) : (
              <sprite
                key={`marker-${i}`}
                position={[i, -0.7, 0]}
                scale={[0.02, 0.15, 1]}
              >
                <spriteMaterial color="#2d5016" />
              </sprite>
            )
          )}

          {/* Center line (0 meter marker) */}
          <sprite position={[0, -0.7, 0]} scale={[0.03, 0.3, 1]}>
            <spriteMaterial color="#ff4444" />
          </sprite>
        </group>

        {/* Orange moving sprite */}
        <sprite position={[simulation.position, 0, 0]} scale={[0.8, 1.2, 1]}>
          <spriteMaterial color="orange" />
        </sprite>
      </Canvas>

      {/* Simple HTML text overlays for ruler labels */}
      <div className="absolute bottom-0.5 left-[2.5%] text-green-800 text-sm font-bold pointer-events-none">
        -10
      </div>
      <div className="absolute bottom-0.5 left-[12.5%] text-green-800 text-sm font-bold pointer-events-none">
        -8
      </div>
      <div className="absolute bottom-0.5 left-[21.5%] text-green-800 text-sm font-bold pointer-events-none">
        -6
      </div>
      <div className="absolute bottom-0.5 left-[30.5%] text-green-800 text-sm font-bold pointer-events-none">
        -4
      </div>
      <div className="absolute bottom-0.5 left-[39.5%] text-green-800 text-sm font-bold pointer-events-none">
        -2
      </div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-red-500 text-sm pointer-events-none">
        0 meters
      </div>
      <div className="absolute bottom-0.5 right-[41.5%] text-green-800 text-sm font-bold pointer-events-none">
        2
      </div>
      <div className="absolute bottom-0.5 right-[32.5%] text-green-800 text-sm font-bold pointer-events-none">
        4
      </div>
      <div className="absolute bottom-0.5 right-[23.5%] text-green-800 text-sm font-bold pointer-events-none">
        6
      </div>
      <div className="absolute bottom-0.5 right-[14.5%] text-green-800 text-sm font-bold pointer-events-none">
        8
      </div>
      <div className="absolute bottom-0.5 right-[5.5%] text-green-800 text-sm font-bold pointer-events-none">
        10
      </div>
    </div>
  );
}

export default Simulation3D;
