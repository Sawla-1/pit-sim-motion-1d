import { useRef, useEffect } from "react";

export function useSimulationLoop({
  playing,
  time,
  simulation,
  data,
  setSimulation,
  setData,
  setPlaying,
  onRecordStep,
  onPlaybackStep,
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

  // Auto-pause and reset the clock when the tab is hidden, so a backgrounded
  // tab can't accumulate a huge stalled frameTime that would otherwise get
  // clamped into a single large physics jump on return.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        setPlaying(false);
        last.current = performance.now();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [setPlaying]);

  // Real per-frame delta animation loop (PhET-style): each RAF tick advances
  // physics by however much wall-clock time actually elapsed, clamped so a
  // stalled/slow frame can't inject a huge jump.
  useEffect(() => {
    let raf;
    const MAX_FRAME_TIME = 0.1; // seconds; caps the delta from a stalled frame

    function loop(now) {
      const frameTime = Math.min((now - last.current) / 1000, MAX_FRAME_TIME);
      last.current = now;

      if (playing) {
        const sim = simulationRef.current;
        const dat = dataRef.current;

        if (dat.selectedMode === "playback" && dat.recordedData.length > 1) {
          // PLAYBACK MODE: advance through recorded data — no wall-clock refs needed
          const result = onPlaybackStep(dat, frameTime);
          setSimulation(result.simulation);
          setData((prev) => ({ ...prev, ...result.data }));
          if (result.isEndOfPlayback) setPlaying(false);
        } else {
          // RECORDING MODE: anchor start time to current sim.time so that
          // resuming after a mode round-trip begins the clock from the right offset
          if (recordRealTimeStart.current === null) {
            recordRealTimeStart.current = now - (sim.time + frameTime) * 1000;
          }
          const realElapsedTime = (now - recordRealTimeStart.current) / 1000;
          const result = onRecordStep(sim, frameTime, realElapsedTime);
          setSimulation(result.simulation);
          setData((prev) => ({
            ...prev,
            recordedData: [...prev.recordedData, result.recordedState],
          }));
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, setSimulation, setData, setPlaying, onRecordStep, onPlaybackStep]); // setters are stable React refs; listed to satisfy exhaustive-deps
}
