import { useState } from "react";
import Simulation3D from "./components/Simulation3D";
import Charts from "./components/Charts";
import Controls from "./components/Controls";
import { useSimulationLoop } from "./hooks/useSimulationLoop";
import { findClosestState } from "./engine/playback";
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
    recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }], // All simulation states
    selectedMode: "record", // 'record' or 'playback'
    playbackTime: 0, // Current playback time
  });

  useSimulationLoop({
    playing,
    time: simulation.time,
    simulation,
    data,
    setSimulation,
    setData,
    setPlaying,
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

  // Toggle play/pause
  const togglePlayPause = () => {
    if (playing) {
      setPlaying(false);
    } else {
      setPlaying(true);
    }
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
      recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }],
      playbackTime: 0,
      selectedMode: "record",
    }));
    setSimulation((prev) => ({ ...prev, time: 0 }));
  };

  // Handle timeline scrubbing from charts
  const handleSetPlaybackTime = (newTime) => {
    setData((prev) => ({ ...prev, playbackTime: newTime }));
    const closestState = findClosestState(data.recordedData, newTime);
    if (closestState) {
      setSimulation({
        position: closestState.position,
        velocity: closestState.velocity,
        acceleration: closestState.acceleration,
        time: closestState.time,
      });
    }
  };

  // Handler for simulation parameter changes
  const handleSimulationChange = (changes) => {
    setSimulation((prev) => ({ ...prev, ...changes }));
  };

  // ============================================================================
  // RENDER - Using refactored components
  // ============================================================================

  return (
    <div className="min-h-screen w-full p-2 flex flex-col gap-1 box-border bg-gradient-to-br bg-blue-700 text-gray-800 overflow-x-hidden">
      {/* Simulation Display Area */}
      <div className="relative w-full mb-1">
        <Simulation3D position={simulation.position} />

        {/* Time Display */}
        <div
          className="absolute top-2 right-4 font-mono text-3xl font-bold z-10 text-gray-800"
          style={{ textShadow: "1px 1px 2px rgba(255, 255, 255, 0.8)" }}
        >
          {formatNumber(simulation.time, 1)} s
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-1 w-full">
        {/* Left Panel: Charts */}
        <Charts
          data={data}
          simulation={simulation}
          onSetPlaybackTime={handleSetPlaybackTime}
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
