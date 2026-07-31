import { useRef, useEffect } from "react";

export function useSimulationLoop({
  playing,
  simulation,
  data,
  setSimulation,
  setData,
  setPlaying,
  onRecordStep,
  onPlaybackStep,
}) {
  const last = useRef(performance.now());

  // Always-current refs so the RAF callback reads fresh state every tick
  const simulationRef = useRef(simulation);
  simulationRef.current = simulation;
  const dataRef = useRef(data);
  dataRef.current = data;

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
    const MAX_RECORD_TIME = 600; // seconds (10 min); auto-pause so recordedData can't grow unbounded

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
          // RECORDING MODE: time accumulates as simulation.time + frameTime,
          // so pausing just stops adding to it — no anchor/pause bookkeeping needed
          const result = onRecordStep(sim, frameTime);
          setSimulation(result.simulation);
          setData((prev) => ({
            ...prev,
            recordedData: [...prev.recordedData, result.recordedState],
          }));
          if (result.simulation.time >= MAX_RECORD_TIME) {
            setPlaying(false);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, setSimulation, setData, setPlaying, onRecordStep, onPlaybackStep]); // setters are stable React refs; listed to satisfy exhaustive-deps
}
