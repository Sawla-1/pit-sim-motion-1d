import { useRef, useEffect } from "react";
import { handlePlaybackStep, handleRecordingStep } from "../engine/playback";

export function useSimulationLoop({
  playing,
  time,
  simulation,
  data,
  setSimulation,
  setData,
  setPlaying,
}) {
  const last = useRef(performance.now());
  const recordRealTimeStart = useRef(null);
  const recordPauseStartTime = useRef(null);

  // Always-current refs so the RAF callback reads fresh state every tick
  const simulationRef = useRef(simulation);
  simulationRef.current = simulation;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Reset record timing refs when simulation time is reset to 0
  useEffect(() => {
    if (time === 0) {
      recordRealTimeStart.current = null;
      recordPauseStartTime.current = null;
    }
  }, [time]);

  // Track pause/resume for record-mode timing only; playback does not touch these refs
  useEffect(() => {
    if (playing) {
      // Resuming from a record-mode pause — adjust start time to exclude pause duration
      if (recordPauseStartTime.current !== null && recordRealTimeStart.current !== null) {
        const pauseDuration =
          (performance.now() - recordPauseStartTime.current) / 1000;
        recordRealTimeStart.current += pauseDuration * 1000;
        recordPauseStartTime.current = null;
      }
    } else if (dataRef.current.selectedMode === "record") {
      // Pausing in record mode — stamp when the pause started
      if (recordRealTimeStart.current !== null) {
        recordPauseStartTime.current = performance.now();
      }
    }
    // Pausing in playback mode: no-op — playback has no timing refs to maintain
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
        accumulator += frameTime;
        while (accumulator >= FIXED_TIMESTEP) {
          const sim = simulationRef.current;
          const dat = dataRef.current;

          if (dat.selectedMode === "playback" && dat.recordedData.length > 1) {
            // PLAYBACK MODE: advance through recorded data — no wall-clock refs needed
            const result = handlePlaybackStep(dat, FIXED_TIMESTEP);
            setSimulation(result.simulation);
            setData((prev) => ({ ...prev, ...result.data }));
            if (result.isEndOfPlayback) setPlaying(false);
          } else {
            // RECORDING MODE: anchor start time to current sim.time so that
            // resuming after a mode round-trip begins the clock from the right offset
            if (recordRealTimeStart.current === null) {
              recordRealTimeStart.current = now - sim.time * 1000;
            }
            const realElapsedTime = (now - recordRealTimeStart.current) / 1000;
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
  }, [playing, setSimulation, setData, setPlaying]); // setters are stable React refs; listed to satisfy exhaustive-deps
}
