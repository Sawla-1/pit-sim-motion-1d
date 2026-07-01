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
 * A single physics parameter input: label, text box, and range slider.
 * Owns the local string state, last-valid ref, and external-sync effect.
 */
function PhysicsInput({ label, unit, value, min, max, labelClass, accentClass, focusClass, onChange }) {
  const [text, setText] = useState(String(value));
  const lastValid = useRef(value);

  useEffect(() => {
    setText(String(value));
    lastValid.current = value;
  }, [value]);

  const commit = (raw) => {
    const evaluated = evaluateExpression(raw.trim());
    if (evaluated !== null) {
      setText(String(evaluated));
      lastValid.current = evaluated;
      onChange(evaluated);
    } else {
      setText(String(lastValid.current));
    }
  };

  return (
    <div className="flex flex-col gap-1 mb-1.5 last:mb-0">
      <span className={`${labelClass} font-semibold text-sm`}>
        {label} ({unit})
      </span>
      <div className="flex gap-1">
        <input
          type="text"
          value={text}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          className={`w-1/2 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-black transition-colors focus:outline-none ${focusClass} focus:shadow-[0_0_0_3px_rgba(42,82,152,0.1)]`}
        />
        <span className="text-sm">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={`w-1/2 ${accentClass}`}
        />
        <span className="text-sm">{max}</span>
      </div>
    </div>
  );
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
  return (
    <div className="bg-white/95 rounded-lg p-3 shadow-lg backdrop-blur-sm flex flex-col gap-3 flex-1">
      {/* Parameter Input Section */}
      <div className="rounded-md p-2 border-2 border-blue-400 bg-blue-100">
        <h4 className="m-0 mb-1.5 font-semibold text-blue-800 border-b border-blue-100 pb-1">
          Initial Conditions
        </h4>

        <PhysicsInput
          label="Position" unit="m"
          value={simulation.position} min={-10} max={10}
          labelClass="text-blue-600"
          accentClass="accent-blue-600"
          focusClass="focus:border-blue-600"
          onChange={(v) => onSimulationChange({ position: v })}
        />
        <PhysicsInput
          label="Velocity" unit="m/s"
          value={simulation.velocity} min={-10} max={10}
          labelClass="text-red-600"
          accentClass="accent-red-600"
          focusClass="focus:border-red-600"
          onChange={(v) => onSimulationChange({ velocity: v })}
        />
        <PhysicsInput
          label="Acceleration" unit="m/s²"
          value={simulation.acceleration} min={-10} max={10}
          labelClass="text-green-600"
          accentClass="accent-green-700"
          focusClass="focus:border-green-600"
          onChange={(v) => onSimulationChange({ acceleration: v })}
        />
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
