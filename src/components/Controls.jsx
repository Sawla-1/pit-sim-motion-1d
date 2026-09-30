import { useState } from "react";
import { evaluateExpression } from "../engine/evaluateExpression";

/**
 * A single physics parameter input: label, text box, and range slider.
 * While the user is typing, the box shows their draft text; otherwise it
 * shows the live value. No effect is needed to keep the two in sync.
 */
function PhysicsInput({ label, unit, value, min, max, labelClass, accentClass, focusClass, disabled, onChange }) {
  const [draft, setDraft] = useState(null); // null = not typing right now
  const shown = String(Math.round(value * 100) / 100); // 2 decimals
  const text = draft ?? shown;

  // Valid input is sent up; invalid input is simply dropped, so the box
  // falls back to showing the last real value. Unchanged text is skipped,
  // so clicking in and out doesn't round the real value to 2 decimals.
  const commit = (raw) => {
    const evaluated = evaluateExpression(raw);
    if (evaluated !== null && raw !== shown) onChange(evaluated);
    setDraft(null);
  };

  return (
    <div className="flex flex-col gap-1 mb-1 last:mb-0">
      <span className={`${labelClass} font-semibold text-sm`}>
        {label} ({unit})
      </span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={text}
          disabled={disabled}
          onFocus={(e) => {
            setDraft(shown);
            e.target.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          className={`w-16 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-black transition-colors focus:outline-none ${focusClass} focus:shadow-[0_0_0_3px_rgba(42,82,152,0.1)] disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        <span className="text-sm">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`flex-1 min-w-0 ${accentClass} disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        <span className="text-sm">{max}</span>
      </div>
    </div>
  );
}

const stepButton = "w-[46px] h-[46px] rounded-full border border-[#d9dee6] bg-white text-slate-700 flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

// Small SVG icons, same shapes as the mockup
const PlayIcon = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z" /></svg>;
const PauseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
const PrevIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="3" height="14" rx="1" /><path d="M19 5.5v13a1 1 0 0 1-1.5.86l-10-6.5a1 1 0 0 1 0-1.72l10-6.5A1 1 0 0 1 19 5.5z" /></svg>;
const NextIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="16" y="5" width="3" height="14" rx="1" /><path d="M5 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 5 5.5z" /></svg>;

/**
 * Controls Component - Parameter inputs, mode selection, and control buttons
 * Contains all the UI controls for the simulation
 */
function Controls({
  simulation,
  playing,
  data,
  onSimulationChange,
  onModeChange,
  onTogglePlayPause,
  onNextFrame,
  onPrevFrame,
  onReset,
  onClearRecordedData,
}) {
  // Frame stepping only works in playback mode, and not while playing
  const canStepFrames = data.selectedMode === "playback" && !playing;
  const lastTime = data.recordedData[data.recordedData.length - 1].time;

  return (
    <div className="flex flex-col bg-white">
      {/* Inputs: stay here for now; step 3 moves them next to each chart */}
      <div className="flex flex-wrap justify-center gap-6 px-4 pt-2">
        <div className="w-64">
          <PhysicsInput
            label="Position" unit="m"
            value={simulation.position} min={-10} max={10}
            disabled={playing}
            labelClass="text-blue-600"
            accentClass="accent-blue-600"
            focusClass="focus:border-blue-600"
            onChange={(v) => onSimulationChange({ position: v })}
          />
        </div>
        <div className="w-64">
          <PhysicsInput
            label="Velocity" unit="m/s"
            value={simulation.velocity} min={-10} max={10}
            disabled={playing}
            labelClass="text-red-600"
            accentClass="accent-red-600"
            focusClass="focus:border-red-600"
            onChange={(v) => onSimulationChange({ velocity: v })}
          />
        </div>
        <div className="w-64">
          <PhysicsInput
            label="Acceleration" unit="m/s²"
            value={simulation.acceleration} min={-10} max={10}
            disabled={playing}
            labelClass="text-green-600"
            accentClass="accent-green-700"
            focusClass="focus:border-green-600"
            onChange={(v) => onSimulationChange({ acceleration: v })}
          />
        </div>
      </div>

      {/* Bottom bar: Clear | mode | prev / play / next | Reset All */}
      <div className="flex flex-wrap items-center justify-center gap-6 py-3 lg:gap-[88px] lg:h-[116px] lg:py-0">
        <button
          onClick={onClearRecordedData}
          disabled={data.recordedData.length <= 1}
          className="w-[140px] h-11 rounded-[10px] border border-gray-300 bg-white text-slate-800 text-base font-bold uppercase tracking-wide shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>

        <div className="flex flex-col gap-1.5 text-[19px] text-gray-800">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="record"
              checked={data.selectedMode === "record"}
              onChange={() => onModeChange("record")}
            />
            Record
          </label>
          <label
            className={`flex items-center gap-2.5 cursor-pointer ${
              data.recordedData.length <= 1 ? "opacity-50 cursor-not-allowed" : ""
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
            Playback
          </label>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={onPrevFrame}
            disabled={!canStepFrames || simulation.time <= 0}
            title="Previous frame"
            aria-label="Previous frame"
            className={stepButton}
          >
            <PrevIcon />
          </button>
          <button
            onClick={onTogglePlayPause}
            aria-label={playing ? "Pause" : "Play"}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg ${
              playing ? "bg-red-500" : "bg-[#2f6fe4]"
            }`}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            onClick={onNextFrame}
            disabled={!canStepFrames || simulation.time >= lastTime}
            title="Next frame"
            aria-label="Next frame"
            className={stepButton}
          >
            <NextIcon />
          </button>
        </div>

        <button
          onClick={onReset}
          disabled={
            simulation.position === 0 &&
            simulation.velocity === 0 &&
            simulation.acceleration === 0
          }
          className="w-[140px] h-11 rounded-[10px] bg-rose-600 text-white text-base font-bold uppercase tracking-wide shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset All
        </button>
      </div>
    </div>
  );
}

export default Controls;
