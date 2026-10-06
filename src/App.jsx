import { useState } from "react";
import Simulation3D from "./components/Simulation3D";
import Charts from "./components/Charts";
import Controls from "./components/Controls";
import ConfirmDialog from "./components/ConfirmDialog";
import PhysicsInput from "./components/PhysicsInput";
import { SERIES_COLORS } from "./styles/seriesColors";
import { useSimulationLoop } from "./hooks/useSimulationLoop";
import {
  handleRecordingStep,
  handlePlaybackStep,
  handlePlaybackSeek,
} from "./engine/recordPlayback";
import { formatNumber } from "./utils/formatNumber";

const FRAME_STEP = 0.1; // seconds moved by one Next/Previous frame click
const PIN_TOLERANCE = 0.05; // seconds: "same time" for Unpin (half a frame step)

function App() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core simulation state
  const [simulation, setSimulation] = useState({
    position: 0, // Current position (meters)
    velocity: 0, // Current velocity (m/s)
    acceleration: 0, // Current acceleration (m/s²)
    time: 0, // Current simulation time (seconds)
  });

  const [playing, setPlaying] = useState(false);
  // Turns true the first time the user opens Playback; stops the "try me" hint
  const [playbackTried, setPlaybackTried] = useState(false);
  // Turns true the first time the user drags a chart; stops the scrub hint
  const [scrubTried, setScrubTried] = useState(false);

  // Data and mode state
  const [data, setData] = useState({
    recordedData: [simulation], // All simulation states
    selectedMode: "record", // 'record' or 'playback'
  });

  // Is the "Reset everything?" popup open
  const [confirmingReset, setConfirmingReset] = useState(false);

  // One pinned snapshot { time, position, velocity, acceleration }, or null
  const [pin, setPin] = useState(null);
  const isPinned = pin !== null && Math.abs(pin.time - simulation.time) < PIN_TOLERANCE;

  useSimulationLoop({
    playing,
    simulation,
    data,
    setSimulation,
    setData,
    setPlaying,
    onRecordStep: handleRecordingStep,
    onPlaybackStep: handlePlaybackStep,
  });

  // ============================================================================
  // CONTROL FUNCTIONS
  // ============================================================================

  // Reset everything to initial state
  const reset = () => {
    setSimulation({
      position: 0,
      velocity: 0,
      acceleration: 0,
      time: 0,
    });
    setPlaying(false);
    setPin(null);
    setData((prev) => ({
      ...prev,
      recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }],
      selectedMode: "record",
    }));
  };

  // How long the recording is, for the Reset popup text
  const recordedSeconds = data.recordedData[data.recordedData.length - 1].time;

  // Reset All only asks when there is a recording to lose
  const requestReset = () => (data.recordedData.length > 1 ? setConfirmingReset(true) : reset());

  // Toggle play/pause
  const togglePlayPause = () => setPlaying(p => !p);

  // Switch between Record and Playback modes
  const switchMode = (mode) => {
    setData((prev) => ({ ...prev, selectedMode: mode }));

    if (mode === "playback") {
      setPlaybackTried(true);
      // Switch to playback: reset playback time
      setSimulation(() => ({
        time: 0,
        position: data.recordedData[0].position,
        velocity: data.recordedData[0].velocity,
        acceleration: data.recordedData[0].acceleration,
      }));
      setPlaying(false);
    } else {
      // Switch to record: continue from latest recorded data
      const lastState = data.recordedData[data.recordedData.length - 1];
      setSimulation({
        position: lastState.position,
        velocity: lastState.velocity,
        acceleration: lastState.acceleration,
        time: lastState.time,
      });
      setPlaying(false);
    }
  };

  // Clear all recorded data
  const clearRecordedData = () => {
    setPin(null);
    setData((prev) => ({
      ...prev,
      recordedData: [{ time: 0, position: simulation.position, velocity: simulation.velocity, acceleration: simulation.acceleration }],
      selectedMode: "record",
    }));
    setSimulation((prev) => ({ ...prev, time: 0 }));
  };

  // At the pinned time: unpin. Anywhere else: pin here (replaces the old pin).
  const togglePin = () => setPin(isPinned ? null : simulation);

  // Jump the time to the pinned point (same seek as the frame buttons)
  const goToPin = () => handleSeek(pin.time);

  // Handle timeline scrubbing from charts
  const handleSeek = (newTime) => {
    const result = handlePlaybackSeek(data.recordedData, newTime);
    setSimulation(result.simulation);
  };

  // Dragging on a chart: remember it (the hint goes away), then move the time
  const handleScrub = (newTime) => {
    setScrubTried(true);
    handleSeek(newTime);
  };

  // Step playback one frame forward / back (clamped so time never goes below 0)
  const handleNextFrame = () => handleSeek(simulation.time + FRAME_STEP);
  const handlePrevFrame = () => handleSeek(Math.max(0, simulation.time - FRAME_STEP));

  // Handler for simulation parameter changes
  const handleSimulationChange = (changes) => {
    setSimulation((prev) => ({ ...prev, ...changes }));
    if (simulation.time === 0 && data.selectedMode === 'record') {
      setData((prev) => ({
        ...prev,
        recordedData: [{ ...prev.recordedData[0], ...changes }],
      }));
    }
  };

  // ============================================================================
  // RENDER - Using refactored components
  // ============================================================================

  // The 3 inputs are shown beside their charts (Charts puts each in its row)
  const inputs = [
    { key: "position", label: "Position", unit: "m" },
    { key: "velocity", label: "Velocity", unit: "m/s" },
    { key: "acceleration", label: "Acceleration", unit: "m/s²" },
  ].map(({ key, label, unit }) => (
    <PhysicsInput
      key={key} id={key} label={label} unit={unit}
      value={simulation[key]} min={-10} max={10}
      color={SERIES_COLORS[key].color} track={SERIES_COLORS[key].track}
      disabled={playing}
      onChange={(v) => handleSimulationChange({ [key]: v })}
    />
  ));

  const isRecording = data.selectedMode === "record";

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col box-border bg-[#C9EEEA] text-gray-800 overflow-x-clip">
      {/* Top: 3D scene + time */}
      <div className="relative w-full shrink-0 h-[125px] [@media(max-height:600px)]:h-[112px]">
        <Simulation3D position={simulation.position} velocity={simulation.velocity} />

        {/* Time Display (left) */}
        <div
          className="absolute top-2 left-8 font-mono text-3xl font-bold z-10 text-gray-800"
          style={{ textShadow: "1px 1px 2px rgba(255, 255, 255, 0.8)" }}
        >
          {formatNumber(simulation.time, 1)} s
        </div>

        {/* Mode badge (right), only while playing */}
        {playing && (
          <span role="status" className={`absolute top-3 right-8 z-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest ${
            isRecording ? "text-red-600" : "text-blue-600"
          }`}>
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping ${
                isRecording ? "bg-red-500" : "bg-blue-500"
              }`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${
                isRecording ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.7)]" : "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.7)]"
              }`} />
            </span>
            {isRecording ? "Recording" : "Playing back"}
          </span>
        )}
      </div>

      {/* Middle: charts take all the space that is left (short screens: less padding) */}
      <div className="flex flex-col w-full px-4 pt-4 pb-2 [@media(max-height:600px)]:pt-2.5 max-lg:[@media(max-height:600px)]:pb-1 lg:pb-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
        <Charts
          data={data}
          simulation={simulation}
          pin={pin}
          onSeek={handleScrub}
          showScrubHint={data.selectedMode === "playback" && !scrubTried}
          inputs={inputs}
        />
      </div>

      {/* Bottom: the toolbar pill, centered, 8px gap under it */}
      <div className="shrink-0 flex justify-center px-4 sm:pl-[212px] sm:pr-[64px] pb-2">
        <Controls
          simulation={simulation}
          playing={playing}
          data={data}
          playbackTried={playbackTried}
          isPinned={isPinned}
          hasPin={pin !== null}
          onTogglePin={togglePin}
          onGoToPin={goToPin}
          onModeChange={switchMode}
          onTogglePlayPause={togglePlayPause}
          onNextFrame={handleNextFrame}
          onPrevFrame={handlePrevFrame}
          onReset={requestReset}
          onClearRecordedData={clearRecordedData}
        />
      </div>

      {confirmingReset && (
        <ConfirmDialog
          title="Reset everything?"
          message={
            <>
              <p>This will remove:</p>
              <ul className="mt-1 list-disc space-y-0.5 rounded-lg border border-rose-100 bg-rose-50 py-2 pl-7 pr-3 marker:text-rose-400">
                <li>Your {formatNumber(recordedSeconds, 1)} s recording</li>
                <li>Position, velocity and acceleration (set back to 0)</li>
                {pin && <li>Your pinned point</li>}
              </ul>
              <p className="mt-3 font-semibold text-rose-700">This cannot be undone.</p>
            </>
          }
          confirmLabel="Reset All"
          onConfirm={() => {
            reset();
            setConfirmingReset(false);
          }}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}

export default App;
