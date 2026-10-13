import { useState,useRef } from "react";
import Simulation3D from "./components/Simulation3D";
import Charts from "./components/Charts";
import Controls from "./components/Controls";
import { useSimulationLoop } from "./hooks/useSimulationLoop";
import {
  handleRecordingStep,
  handlePlaybackStep,
  handlePlaybackSeek,
  trimRecordedDataAfter,
} from "./engine/recordPlayback";
import { calculateDragStep, NUMBER_MOUSE_POINTS_TO_AVERAGE } from "./engine/kinematics1d";
import { formatNumber } from "./utils/formatNumber";

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

  // Data and mode state
  const [data, setData] = useState({
    recordedData: [simulation], // All simulation states
    selectedMode: "record", // 'record' or 'playback'
    playbackTime: 0, // Current playback time
  });

  // null = not dragging; array of { x: meters, t: wallClockMs } while dragging
  const dragSamples = useRef(null);

  const onDragStep = (sim, frameTime) => {
    const next = calculateDragStep(sim, frameTime, dragSamples.current);
    return {
      simulation: next,
      recordedState: {
        time: next.time,
        position: next.position,
        velocity: next.velocity,
        acceleration: next.acceleration,
      },
    };
  };

  useSimulationLoop({
    playing,
    simulation,
    data,
    setSimulation,
    setData,
    setPlaying,
    onRecordStep: handleRecordingStep,
    onPlaybackStep: handlePlaybackStep,
    onDragStep,
    dragSamplesRef: dragSamples,
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
    setData((prev) => ({
      ...prev,
      recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }],
      playbackTime: 0,
      selectedMode: "record",
    }));
  };

  // Recording from a past time (after scrubbing back) replaces everything after it, like PhET
  const trimRecordingToNow = () => {
    setData((prev) => ({
      ...prev,
      recordedData: trimRecordedDataAfter(prev.recordedData, simulation.time),
    }));
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!playing && data.selectedMode === "record") trimRecordingToNow();
    setPlaying(p => !p);
  };

  // Switch between Record and Playback modes
  const switchMode = (mode) => {
    setData((prev) => ({ ...prev, selectedMode: mode }));

    if (mode === "playback" && data.recordedData.length > 0) {
      // Switch to playback: reset playback time
      setSimulation((prev) => ({
        ...prev,
        time: 0,
        position: data.recordedData[0].position,
        velocity: data.recordedData[0].velocity,
        acceleration: data.recordedData[0].acceleration,
      }));
      setPlaying(false);
      setData((prev) => ({
        ...prev,
        playbackTime: 0,
      }));
    } else if (mode === "record") {
      // Switch to record: continue from latest recorded data
      if (data.recordedData.length > 0) {
        const lastState = data.recordedData[data.recordedData.length - 1];
        setSimulation({
          position: lastState.position,
          velocity: lastState.velocity,
          acceleration: lastState.acceleration,
          time: lastState.time,
        });
        setPlaying(false);
      } else {
        // No recorded data: start from beginning
        setSimulation({
          position: 0,
          velocity: 0,
          acceleration: 0,
          time: 0,
        });
        setPlaying(false);
      }
    }
  };

  // Clear all recorded data
  const clearRecordedData = () => {
    setData((prev) => ({
      ...prev,
      recordedData: [{ time: 0, position: simulation.position, velocity: simulation.velocity, acceleration: simulation.acceleration }],
      playbackTime: 0,
      selectedMode: "record",
    }));
    setSimulation((prev) => ({ ...prev, time: 0 }));
  };

  // Handle timeline scrubbing from charts
  const handleSeek = (newTime) => {
    const result = handlePlaybackSeek(data.recordedData, newTime);
    setSimulation(result.simulation);
    setData((prev) => ({ ...prev, ...result.data }));
  };

  // Handler for simulation parameter changes
  const handleSimulationChange = (changes) => {
    setSimulation((prev) => ({ ...prev, ...changes }));
    if (simulation.time === 0) {
      setData((prev) => ({
        ...prev,
        recordedData: [{ ...prev.recordedData[0], ...changes }],
      }));
    }
  };

  const handleManDragStart = () => {
    dragSamples.current = [];
    trimRecordingToNow();
    setData((prev) => ({ ...prev, selectedMode: "record" }));
    setPlaying(true);
  };

  // Called on every raw mouse reading while dragging. Just records the
  // reading — the smoothing and the actual position/velocity math happen
  // once per frame in onDragStep above, not here.
  const handleManDragSample = (meters) => {
    if (!dragSamples.current) return;
    const next = [...dragSamples.current, { x: meters, t: performance.now() }];
    dragSamples.current = next.slice(-NUMBER_MOUSE_POINTS_TO_AVERAGE);
  };

  const handleManDragEnd = () => {
    dragSamples.current = null;
    setSimulation((prev) => ({ ...prev, velocity: 0, acceleration: 0 }));
  };


  // ============================================================================
  // RENDER - Using refactored components
  // ============================================================================

  return (
    <div className="min-h-screen w-full p-2 flex flex-col gap-1 box-border bg-gradient-to-br bg-blue-700 text-gray-800 overflow-x-hidden">
      {/* Simulation Display Area */}
      <div className="relative w-full mb-1">
        <Simulation3D
          position={simulation.position}
          velocity={simulation.velocity}
          onManDragStart={handleManDragStart}
          onManDragSample={handleManDragSample}
          onManDragEnd={handleManDragEnd}
        />

        {/* Time Display */}
        <div
          className="absolute top-2 right-4 font-mono text-3xl font-bold z-10 text-gray-800"
          style={{ textShadow: "1px 1px 2px rgba(255, 255, 255, 0.8)" }}
        >
          {formatNumber(simulation.time, 1)} s
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-1 w-full md:flex-row">
        {/* Left Panel: Charts */}
        <Charts
          data={data}
          simulation={simulation}
          onSeek={handleSeek}
        />
        {/* Right Panel: Controls */}
        <Controls
          simulation={simulation}
          playing={playing}
          data={data}
          onSimulationChange={handleSimulationChange}
          onModeChange={switchMode}
          onTogglePlayPause={togglePlayPause}
          onReset={reset}
          onClearRecordedData={clearRecordedData}
        />
      </div>
    </div>
  );
}

export default App;
