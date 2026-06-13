import { useState, useRef, useEffect } from "react";

/**
 * Safely evaluates mathematical expressions
 * Returns null if expression is invalid
 */
function evaluateExpression(expression) {
  try {
    const trimmed = expression.trim();
    if (!trimmed) return null;

    // Remove any non-math characters except numbers, operators, parentheses, decimal points, and spaces
    const cleaned = trimmed.replace(/[^0-9+\-*/().\s]/g, "");
    if (!cleaned) return null;

    // Use Function constructor for safer evaluation
    const result = new Function('"use strict"; return (' + cleaned + ")")();

    // Validate result is a finite number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Controls Component - Parameter inputs, mode selection, and control buttons
 * Contains all the UI controls for the simulation
 */
function Controls({
  simulation,
  data,
  onSimulationChange,
  onModeChange,
  onTogglePlayPause,
  onReset,
  onClearRecordedData,
}) {
  // Local state for input values (allows intermediate invalid states while typing)
  const [positionInput, setPositionInput] = useState(
    String(simulation.position)
  );
  const [velocityInput, setVelocityInput] = useState(
    String(simulation.velocity)
  );
  const [accelerationInput, setAccelerationInput] = useState(
    String(simulation.acceleration)
  );

  // Refs to store last valid values
  const lastValidPosition = useRef(simulation.position);
  const lastValidVelocity = useRef(simulation.velocity);
  const lastValidAcceleration = useRef(simulation.acceleration);

  // Sync local state when simulation values change externally
  useEffect(() => {
    setPositionInput(String(simulation.position));
    lastValidPosition.current = simulation.position;
  }, [simulation.position]);

  useEffect(() => {
    setVelocityInput(String(simulation.velocity));
    lastValidVelocity.current = simulation.velocity;
  }, [simulation.velocity]);

  useEffect(() => {
    setAccelerationInput(String(simulation.acceleration));
    lastValidAcceleration.current = simulation.acceleration;
  }, [simulation.acceleration]);

  // Position handlers
  const handlePositionChange = (e) => {
    setPositionInput(e.target.value);
  };

  const handlePositionBlur = (e) => {
    const value = e.target.value.trim();
    const evaluated = evaluateExpression(value);

    if (evaluated !== null) {
      const newValue = evaluated;
      setPositionInput(String(newValue));
      lastValidPosition.current = newValue;
      onSimulationChange({ position: newValue });
    } else {
      // Invalid input - revert to last valid value
      setPositionInput(String(lastValidPosition.current));
    }
  };

  const handlePositionKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Trigger blur handler
    }
  };

  // Velocity handlers
  const handleVelocityChange = (e) => {
    setVelocityInput(e.target.value);
  };

  const handleVelocityBlur = (e) => {
    const value = e.target.value.trim();
    const evaluated = evaluateExpression(value);

    if (evaluated !== null) {
      const newValue = evaluated;
      setVelocityInput(String(newValue));
      lastValidVelocity.current = newValue;
      onSimulationChange({ velocity: newValue });
    } else {
      // Invalid input - revert to last valid value
      setVelocityInput(String(lastValidVelocity.current));
    }
  };

  const handleVelocityKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Trigger blur handler
    }
  };

  // Acceleration handlers
  const handleAccelerationChange = (e) => {
    setAccelerationInput(e.target.value);
  };

  const handleAccelerationBlur = (e) => {
    const value = e.target.value.trim();
    const evaluated = evaluateExpression(value);

    if (evaluated !== null) {
      const newValue = evaluated;
      setAccelerationInput(String(newValue));
      lastValidAcceleration.current = newValue;
      onSimulationChange({ acceleration: newValue });
    } else {
      // Invalid input - revert to last valid value
      setAccelerationInput(String(lastValidAcceleration.current));
    }
  };

  const handleAccelerationKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Trigger blur handler
    }
  };
  return (
    <div className="bg-white/95 rounded-lg p-3 shadow-lg backdrop-blur-sm flex flex-col gap-3 flex-1">
      {/* Parameter Input Section */}
      <div className="rounded-md p-2 border-2 border-blue-400 bg-blue-100">
        <h4 className="m-0 mb-1.5 font-semibold text-blue-800 border-b border-blue-100 pb-1">
          Initial Conditions
        </h4>

        {/* Position Input */}
        <div className="flex flex-col gap-1 mb-1.5 last:mb-0">
          <span className="text-blue-600 font-semibold text-sm">
            Position (m)
          </span>
          <div className="flex gap-1">
            <input
              type="text"
              value={positionInput}
              onFocus={(e) => e.target.select()}
              onChange={handlePositionChange}
              onBlur={handlePositionBlur}
              onKeyDown={handlePositionKeyDown}
              className="w-1/2 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-black transition-colors focus:outline-none focus:border-blue-600 focus:shadow-[0_0_0_3px_rgba(42,82,152,0.1)]"
            />
            <span className="text-sm">-10</span>
            <input
              type="range"
              name="position"
              id="x"
              min={-10}
              max={10}
              step={0.1}
              value={simulation.position}
              onChange={(e) =>
                onSimulationChange({ position: Number(e.target.value) || 0 })
              }
              className="w-1/2 accent-blue-600"
            />
            <span className="text-sm">10</span>
          </div>
        </div>

        {/* Velocity Input */}
        <div className="flex flex-col gap-1 mb-1.5 last:mb-0">
          <span className="text-red-600 font-semibold text-sm">
            Velocity (m/s)
          </span>
          <div className="flex gap-1">
            <input
              type="text"
              value={velocityInput}
              onFocus={(e) => e.target.select()}
              onChange={handleVelocityChange}
              onBlur={handleVelocityBlur}
              onKeyDown={handleVelocityKeyDown}
              className="w-1/2 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-black transition-colors focus:outline-none focus:border-red-600 focus:shadow-[0_0_0_3px_rgba(42,82,152,0.1)]"
            />
            <span className="text-sm">-10</span>
            <input
              type="range"
              name="velocity"
              id="v"
              min={-10}
              max={10}
              step={0.1}
              value={simulation.velocity}
              onChange={(e) =>
                onSimulationChange({ velocity: Number(e.target.value) || 0 })
              }
              className="w-1/2 accent-red-600"
            />
            <span className="text-sm">10</span>
          </div>
        </div>

        {/* Acceleration Input */}
        <div className="flex flex-col gap-1 mb-1.5 last:mb-0">
          <span className="text-green-600 font-semibold text-sm">
            Acceleration (m/s²)
          </span>
          <div className="flex gap-1">
            <input
              type="text"
              value={accelerationInput}
              onFocus={(e) => e.target.select()}
              onChange={handleAccelerationChange}
              onBlur={handleAccelerationBlur}
              onKeyDown={handleAccelerationKeyDown}
              className="w-1/2 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-black transition-colors focus:outline-none focus:border-green-600 focus:shadow-[0_0_0_3px_rgba(42,82,152,0.1)]"
            />
            <span className="text-sm">-10</span>
            <input
              type="range"
              name="acceleration"
              id="a"
              min={-10}
              max={10}
              step={0.1}
              value={simulation.acceleration}
              onChange={(e) =>
                onSimulationChange({
                  acceleration: Number(e.target.value) || 0,
                })
              }
              className="w-1/2 accent-green-700"
            />
            <span className="text-sm">10</span>
          </div>
        </div>
      </div>

      {/* Mode Selection Section */}
      <div className="rounded-md p-2 border-2 border-blue-400 bg-blue-100">
        <h4 className="m-0 mb-1.5 font-semibold text-blue-800 border-b border-blue-100 pb-1">
          Mode
        </h4>
        <div className="flex gap-3 mt-1">
          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-800 font-medium mb-0 py-0.5">
            <input
              type="radio"
              name="mode"
              value="record"
              checked={data.selectedMode === "record"}
              onChange={() => onModeChange("record")}
            />
            <span>Record</span>
          </label>
          <label
            className={`flex items-center gap-1.5 text-sm text-gray-800 font-medium mb-0 py-0.5 cursor-pointer ${
              data.recordedData.length <= 1
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="playback"
              checked={data.selectedMode === "playback"}
              onChange={() => onModeChange("playback")}
              disabled={data.recordedData.length <= 1}
            />
            <span>Playback</span>
          </label>
        </div>
      </div>

      {/* Control Buttons Section */}
      <div className="bg-blue-400 rounded-md p-2 pb-4 h-full flex flex-col justify-between border-2 border-blue-500">
        <h4 className="font-semibold text-blue-800">Controls</h4>
        <div className="flex justify-center pb-3.5">
          <button
            onClick={onTogglePlayPause}
            disabled={
              data.selectedMode === "playback" && data.recordedData.length === 0
            }
            className={`w-10 h-10 border-none rounded-full text-xs font-semibold cursor-pointer ${
              simulation.playing
                ? "bg-red-500 text-white transition-all hover:scale-105"
                : "bg-blue-600 text-white transition-all hover:scale-105"
            }`}
          >
            {simulation.playing ? "❚❚" : "▶"}
          </button>
        </div>
        <div className="flex gap-5 justify-center">
          <button
            onClick={onClearRecordedData}
            disabled={data.recordedData.length <= 1}
            className="w-22 h-6 rounded-sm border-none text-xs font-semibold cursor-pointer uppercase bg-white text-black transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            Clear
          </button>
          <button
            onClick={onReset}
            disabled={
              simulation.position === 0 &&
              simulation.velocity === 0 &&
              simulation.acceleration === 0
            }
            className="w-22 h-6 rounded-sm border-none text-xs font-semibold cursor-pointer uppercase bg-red-500 text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}

export default Controls;
