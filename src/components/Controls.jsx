// Disabled look for every button in the bar (same as the chart buttons):
// grey, flat (no shadow), "not allowed" cursor. Words turn mid grey so they
// can still be read; icons turn pale grey (still visible).
const disabledLook = "disabled:bg-gray-200 disabled:border-gray-300 disabled:shadow-none disabled:cursor-not-allowed";
const disabledText = `${disabledLook} disabled:text-gray-500`;

const stepButton = `w-8 h-8 rounded-full border border-[#d9dee6] bg-white text-slate-700 flex items-center justify-center shadow-sm cursor-pointer ${disabledLook} disabled:text-gray-400`;

// Small SVG icons, same shapes as the mockup
const PlayIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z" /></svg>;
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
const PrevIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="3" height="14" rx="1" /><path d="M19 5.5v13a1 1 0 0 1-1.5.86l-10-6.5a1 1 0 0 1 0-1.72l10-6.5A1 1 0 0 1 19 5.5z" /></svg>;
const NextIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="16" y="5" width="3" height="14" rx="1" /><path d="M5 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 5 5.5z" /></svg>;

/**
 * Controls Component - the bottom bar: Clear, mode selection, prev/play/next, Reset All
 * (the parameter inputs are beside their charts, see PhysicsInput)
 */
function Controls({
  simulation,
  playing,
  data,
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
    // The white rounded toolbar: Clear | mode | prev / play / next | Reset All
    // (App.jsx places it; short screens under 600px tall: smaller Play)
    <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-[72px] px-8 py-2 bg-white border border-[#d9dee6] rounded-2xl shadow-[0_4px_14px_rgba(15,23,42,0.08)]">
        <button
          onClick={onClearRecordedData}
          disabled={data.recordedData.length <= 1}
          className={`w-24 h-8 rounded-lg border border-gray-300 bg-white text-slate-800 text-sm font-bold uppercase tracking-wide shadow-sm cursor-pointer ${disabledText}`}
        >
          Clear
        </button>

        <div className="flex flex-col gap-1 text-sm text-gray-800">
          <label className="flex items-center gap-2 cursor-pointer">
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
            className={`flex items-center gap-2 cursor-pointer ${
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
            className={`w-12 h-12 [@media(max-height:600px)]:w-11 [@media(max-height:600px)]:h-11 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg ${
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
          className={`w-24 h-8 rounded-lg bg-rose-600 text-white text-sm font-bold uppercase tracking-wide shadow-sm cursor-pointer ${disabledText}`}
        >
          Reset All
        </button>
    </div>
  );
}

export default Controls;
