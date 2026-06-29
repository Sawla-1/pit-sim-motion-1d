import { useRef, useEffect } from "react";

export function useSimulationLoop({ playing, time, onSimulationStep }) {
  const last = useRef(performance.now());
  const realTimeStart = useRef(null);
  const pauseStartTime = useRef(null);

  // Reset realTimeStart when simulation time is reset to 0
  useEffect(() => {
    if (time === 0) {
      realTimeStart.current = null;
      pauseStartTime.current = null;
    }
  }, [time]);

  // Track pause/resume to adjust timing
  useEffect(() => {
    if (playing) {
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
  }, [playing]);

  // Fixed timestep animation loop with frame accumulation for consistent physics
  useEffect(() => {
    let raf;
    let accumulator = 0;
    const FIXED_TIMESTEP = 1 / 24; // 24 FPS physics for consistent behavior

    function loop(now) {
      const frameTime = (now - last.current) / 1000; // Remove clamping for real-world timing
      last.current = now;

      if (playing) {
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
  }, [playing, onSimulationStep]);
}
