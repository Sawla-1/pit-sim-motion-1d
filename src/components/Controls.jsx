import { KAREN_ART, KAREN_BAR } from "../styles/karenStyles";

// Small SVG icons, same shapes as the mockup
const PlayIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z" /></svg>;
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
// Outline double triangles (rewind / forward)
const PrevIcon = () => <svg className={KAREN_BAR.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M11 6 4 12l7 6z" /><path d="M20 6l-7 6 7 6z" /></svg>;
const NextIcon = () => <svg className={KAREN_BAR.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M13 6l7 6-7 6z" /><path d="M4 6l7 6-7 6z" /></svg>;
// Mode icons: red dot = record, small triangle = playback
const RecordDot = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><circle cx="5" cy="5" r="5" /></svg>;
const SmallPlay = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l14-8z" /></svg>;
// Map pin outline: "pin A / pin B". X: "clear both pins"
const PinIcon = () => <svg className={KAREN_BAR.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>;
const ClearPinIcon = () => <svg className={KAREN_BAR.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
// Target / crosshair: "go to the pinned point"
const GoToPinIcon = () => <svg className={KAREN_BAR.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
// A script "f": the sign for "formula"
const FormulaIcon = () => <span className="font-serif italic text-lg leading-none max-sm:text-[22px] sideways:text-[22px]" aria-hidden="true">ƒ</span>;
const TrashIcon =() => <svg className={KAREN_BAR.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;
const RefreshIcon = () => <svg className={KAREN_BAR.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>;

// What the pin button does, by the number of pins there are (0, 1, 2)
const PIN_ACTIONS = ["Pin A", "Pin B", "Clear pins"];

// One part of the Record / Playback switch. A real radio input (hidden from
// view) keeps keyboard and screen reader support; the label is what you see.
// Chosen = solid red, light text. Not chosen = gold text on wood; a soft light patch on hover.
function ModeOption({ value, label, icon, iconOff = "", title, hint, selectedMode, disabled, onModeChange }) {
  return (
    <label title={title} className={`${KAREN_BAR.modeOption} has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#FDE68A] ${
      selectedMode === value
        ? KAREN_BAR.modeOn
        : `${KAREN_BAR.modeOff} ${disabled ? "" : "hover:bg-white/15"}`
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
      <span className={`flex ${selectedMode === value ? "" : iconOff}`}>{icon}</span>
      {label}
      {/* Hint: a soft ring that grows and fades, to say "try me" */}
      {hint && <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#B4262D] motion-safe:animate-ping" />}
    </label>
  );
}

/**
 * Controls Component - the bottom bar: Clear Data, Formula, pins, prev/play/next, mode switch, Reset All
 * (the value inputs are not here: see PhysicsInput)
 */
function Controls({
  simulation,
  playing,
  data,
  playbackTried,
  formulaOpen,
  isPinned,
  pinCount,
  canGoToPin,
  onTogglePin,
  onGoToPin,
  onModeChange,
  onTogglePlayPause,
  onNextFrame,
  onPrevFrame,
  onReset,
  onClearRecordedData,
  showPins,
  compact,
  onFormulaClick,
}) {
  // Prev / next / Pin / Go-to-pin are hidden in record mode. They keep their
  // space (invisible, not removed), so Play and the mode switch never move.
  // Frame stepping also doesn't work while playing.
  const hideInRecord = data.selectedMode === "playback" ? "" : "invisible";
  // Pin buttons are removed on the Intro tab (no charts to pin on)
  const pinLook = showPins ? hideInRecord : "hidden";
  const canStepFrames = !playing;
  const lastTime = data.recordedData.at(-1).time;
  const noRecording = data.recordedData.length <= 1;
  const pinAction = PIN_ACTIONS[pinCount];

  return (
    // The rattan toolbar. Laptops (one row): Clear Data + Formula | prev / play / next + mode | Reset All.
    // Phones and tablets (under 1024px): row 1 = pins, prev / play / next; row 2 = mode, Formula,
    // Clear Data, Reset All. The two groups below are "contents" there, so CSS order can move each
    // button; the order in this code stays the same. (App.jsx places the bar.)
    // Phone turned sideways: one row: mode, Formula, prev / play / next, Clear Data, Reset All.
    <div className={`${KAREN_BAR.box} ${compact ? KAREN_BAR.compact : KAREN_BAR.roomy}`}>
        {/* Left group: Clear Data + Formula (laptops: one block, so the bar keeps its 3 parts) */}
        <div className="flex items-center gap-2 max-lg:contents">
          <button
            onClick={onClearRecordedData}
            disabled={noRecording}
            title="Clear Data"
            className={`${KAREN_BAR.word} ${KAREN_BAR.clear} ${KAREN_BAR.iconOnly} ${KAREN_BAR.iconSideways} max-lg:order-4`}
          >
            <TrashIcon />
            <span className="max-sm:sr-only sideways:sr-only">Clear Data</span>
          </button>
          {/* Opens / closes the formula panel. Pressed look (ring) while it is open. */}
          <button
            onClick={onFormulaClick}
            aria-pressed={formulaOpen}
            title="Type a position formula x(t)"
            className={`${KAREN_BAR.word} ${KAREN_BAR.clear} ${KAREN_BAR.iconOnly} ${KAREN_BAR.iconSideways} max-lg:order-3 sideways:order-2 ${formulaOpen ? "ring-2 ring-[#FDE68A]" : ""}`}
          >
            {/* Phones: only "ƒ", like Clear Data and Reset All (screen readers still hear "Formula") */}
            <FormulaIcon />
            <span className="max-sm:sr-only sideways:sr-only">Formula</span>
          </button>
        </div>

        <div className="order-first w-full lg:order-none lg:w-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 max-lg:contents">
          {/* Phones and tablets: row 1 on its own */}
          <div className="flex items-center gap-1 sm:gap-3 max-lg:order-1 max-lg:w-full sideways:order-3 sideways:w-auto sideways:gap-2 max-lg:justify-center max-sm:gap-2.5">
            <button
              onClick={onTogglePin}
              disabled={isPinned && pinCount < 2}
              title={pinAction}
              aria-label={pinAction}
              className={`${KAREN_BAR.round} ${pinLook}`}
            >
              {pinCount === 2 ? <ClearPinIcon /> : <PinIcon />}
            </button>
            <button
              onClick={onPrevFrame}
              disabled={!canStepFrames || simulation.time <= 0}
              title="Previous frame"
              aria-label="Previous frame"
              className={`${KAREN_BAR.round} ${hideInRecord}`}
            >
              <PrevIcon />
            </button>
            {/* The drum: its red centre is empty in the art, so our Play / Pause icon sits on it */}
            <button
              onClick={onTogglePlayPause}
              aria-label={playing ? "Pause" : "Play"}
              className={KAREN_BAR.drum}
            >
              <img src={KAREN_ART.drum} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full pointer-events-none" />
              <span aria-hidden="true" className={KAREN_BAR.drumRed} />
              <span className={KAREN_BAR.drumIcon}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </span>
            </button>
            <button
              onClick={onNextFrame}
              disabled={!canStepFrames || simulation.time >= lastTime}
              title="Next frame"
              aria-label="Next frame"
              className={`${KAREN_BAR.round} ${hideInRecord}`}
            >
              <NextIcon />
            </button>
            <button
              onClick={onGoToPin}
              disabled={!canGoToPin || playing}
              title="Go to the pinned point"
              aria-label="Go to the pinned point"
              className={`${KAREN_BAR.round} ${pinLook}`}
            >
              <GoToPinIcon />
            </button>
          </div>

          {/* Mode switch: one wood pill, two parts */}
          <div className={KAREN_BAR.modeBox}>
            <ModeOption value="record" label="Record" icon={<RecordDot />} iconOff="text-[#B4262D]" title="Make new data" selectedMode={data.selectedMode} onModeChange={onModeChange} />
            <ModeOption value="playback" label="Playback" icon={<SmallPlay />} title={noRecording ? "Record something first" : "Replay what you recorded"} hint={data.selectedMode === "record" && !noRecording && !playing && !playbackTried} selectedMode={data.selectedMode} onModeChange={onModeChange} disabled={noRecording} />
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={
            noRecording &&
            simulation.position === 0 &&
            simulation.velocity === 0 &&
            simulation.acceleration === 0
          }
          title="Reset All"
          className={`${KAREN_BAR.word} ${KAREN_BAR.reset} ${KAREN_BAR.iconOnly} ${KAREN_BAR.iconSideways} max-lg:order-5`}
        >
          <RefreshIcon />
          <span className="max-sm:sr-only sideways:sr-only">Reset All</span>
        </button>
    </div>
  );
}

export default Controls;
