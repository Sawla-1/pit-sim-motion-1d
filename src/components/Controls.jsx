// Dark bar buttons. "Off" on the dark bar = faded (a grey box would glow here).
const offLook = "disabled:opacity-40 disabled:cursor-not-allowed";

// Prev/next: on = solid blue, white icon (lighter on hover, darker while pressed).
// Off = dark square, pale icon.
const stepButton = `w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer bg-blue-600 border border-blue-500 text-white transition-colors enabled:hover:bg-blue-500 enabled:active:bg-blue-700 disabled:bg-white/5 disabled:border-white/10 disabled:text-slate-400 disabled:cursor-not-allowed`;

// Clear Data / Reset All: icon + words
const wordButton = `h-9 px-4 rounded-xl flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors ${offLook}`;

// Small SVG icons, same shapes as the mockup
const PlayIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z" /></svg>;
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
// Outline double triangles (rewind / forward)
const PrevIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M11 6 4 12l7 6z" /><path d="M20 6l-7 6 7 6z" /></svg>;
const NextIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M13 6l7 6-7 6z" /><path d="M4 6l7 6-7 6z" /></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>;

// One part of the Record / Playback switch. A real radio input (hidden from
// view) keeps keyboard and screen reader support; the label is what you see.
// Chosen = solid blue, white text. Not chosen = grey text, white on hover.
function ModeOption({ value, label, selectedMode, disabled, onModeChange }) {
  return (
    <label className={`px-4 h-8 flex items-center rounded-lg text-sm font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-400 ${
      selectedMode === value
        ? "bg-blue-600 text-white"
        : `text-slate-400 ${disabled ? "" : "hover:text-white"}`
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="radio"
        name="mode"
        value={value}
        checked={selectedMode === value}
        disabled={disabled}
        onChange={() => onModeChange(value)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

/**
 * Controls Component - the bottom bar: Clear Data, prev/play/next, mode switch, Reset All
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
    // The dark rounded toolbar: Clear Data | prev / play / next + mode | Reset All
    // Phones: the middle group takes the first row; Clear and Reset share the second.
    // (App.jsx places it; short screens under 600px tall: smaller Play)
    // Fills the page width, up to 1100px, so Clear and Reset sit at the two ends.
    <div className="w-full max-w-[800px] flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-2 bg-[#1f2437] rounded-2xl shadow-[0_4px_14px_rgba(15,23,42,0.25)]">
        <button
          onClick={onClearRecordedData}
          disabled={data.recordedData.length <= 1}
          className={`${wordButton} bg-white text-slate-800 enabled:hover:bg-slate-200`}
        >
          <TrashIcon />
          Clear Data
        </button>

        <div className="order-first w-full sm:order-none sm:w-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
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
              className="w-12 h-12 [@media(max-height:600px)]:w-11 [@media(max-height:600px)]:h-11 rounded-full flex items-center justify-center text-white cursor-pointer bg-linear-to-br from-blue-500 to-indigo-600 shadow-[0_6px_16px_rgba(59,91,219,0.45)] transition hover:brightness-110 active:scale-95"
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

          {/* Mode switch: one darker box, two parts */}
          <div className="flex gap-1 p-1 rounded-xl bg-black/25 border border-white/10">
            <ModeOption value="record" label="Record" selectedMode={data.selectedMode} onModeChange={onModeChange} />
            <ModeOption value="playback" label="Playback" selectedMode={data.selectedMode} onModeChange={onModeChange} disabled={data.recordedData.length <= 1} />
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={
            simulation.position === 0 &&
            simulation.velocity === 0 &&
            simulation.acceleration === 0
          }
          className={`${wordButton} bg-rose-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.45)] enabled:hover:bg-rose-500 disabled:shadow-none`}
        >
          <RefreshIcon />
          Reset All
        </button>
    </div>
  );
}

export default Controls;
