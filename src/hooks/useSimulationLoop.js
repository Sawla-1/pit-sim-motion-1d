import { useRef, useEffect } from "react";
import { handlePlaybackStep, handleRecordingStep } from "../engine/playback";

export function useSimulationLoop({
  playing,
  time,
  simulation,
  data,
  setSimulation,
  setData,
}) {
  const last = useRef(performance.now());
  const realTimeStart = useRef(null);
  const pauseStartTime = useRef(null);

  // Always-current refs so the RAF callback reads fresh state every tick
  const simulationRef = useRef(simulation);
  simulationRef.current = simulation;
  const dataRef = useRef(data);
  dataRef.current = data;

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
      const frameTime = (now - last.current) / 1000;
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
          const sim = simulationRef.current;
          const dat = dataRef.current;

          if (dat.selectedMode === "playback" && dat.recordedData.length > 1) {
            // PLAYBACK MODE: advance through recorded data
            const result = handlePlaybackStep(dat, FIXED_TIMESTEP);
            setSimulation(result.simulation);
            setData((prev) => ({ ...prev, ...result.data }));
          } else {
            // RECORDING MODE: calculate physics and append to recorded data
            const result = handleRecordingStep(sim, FIXED_TIMESTEP, realElapsedTime);
            setSimulation(result.simulation);
            setData((prev) => ({
              ...prev,
              recordedData: [...prev.recordedData, result.recordedState],
            }));
          }

          accumulator -= FIXED_TIMESTEP;
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, setSimulation, setData]); // setters are stable React refs; listed to satisfy exhaustive-deps
}
