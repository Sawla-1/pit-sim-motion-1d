import { KAREN_ART, KAREN_BAR } from "../styles/karenStyles";

// Small SVG icons, same shapes as the mockup
const PlayIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z" /></svg>;
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
// Outline double triangles (rewind / forward)
const PrevIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M11 6 4 12l7 6z" /><path d="M20 6l-7 6 7 6z" /></svg>;
const NextIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M13 6l7 6-7 6z" /><path d="M4 6l7 6-7 6z" /></svg>;
// Mode icons: red dot = record, small triangle = playback
const RecordDot = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><circle cx="5" cy="5" r="5" /></svg>;
const SmallPlay = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l14-8z" /></svg>;
// Map pin outline: "pin A / pin B". X: "clear both pins"
const PinIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>;
const ClearPinIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
// Target / crosshair: "go to the pinned point"
const GoToPinIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
const TrashIcon =() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>;

// One part of the Record / Playback switch. A real radio input (hidden from
// view) keeps keyboard and screen reader support; the label is what you see.
// Chosen = solid red, white text. Not chosen = plain text on white; a soft cream on hover.
function ModeOption({ value, label, icon, iconOff = "", title, hint, selectedMode, disabled, onModeChange }) {
  return (
    <label title={title} className={`relative px-4 h-8 flex items-center gap-2 rounded-full text-sm font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#3B2A14] ${
      selectedMode === value
        ? KAREN_BAR.modeOn
        : `${KAREN_BAR.modeOff} ${disabled ? "" : "hover:bg-[#F6EBD2]"}`
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
 * Controls Component - the bottom bar: Clear Data, prev/play/next, mode switch, Reset All
 * (the parameter inputs are beside their charts, see PhysicsInput)
 */
function Controls({
  simulation,
  playing,
  data,
  playbackTried,
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
}) {
  // Prev / next / Pin / Go-to-pin are hidden in record mode. They keep their
  // space (invisible, not removed), so Play and the mode switch never move.
  // Frame stepping also doesn't work while playing.
  const hideInRecord = data.selectedMode === "playback" ? "" : "invisible";
  // Pin buttons are removed on the Intro tab (no charts to pin on)
  const pinLook = showPins ? hideInRecord : "hidden";
  const canStepFrames = !playing;
  const lastTime = data.recordedData[data.recordedData.length - 1].time;
  const noRecording = data.recordedData.length <= 1;
  const pinAction = pinCount === 0 ? "Pin A" : pinCount === 1 ? "Pin B" : "Clear pins";

  return (
    // The woven toolbar: Clear Data | prev / play / next + mode | Reset All
    // Phones and small laptops (under 1280px): the middle group takes the first row; Clear and Reset share the second.
    // The mat behind stretches to any number of rows. (App.jsx places it)
    // Fills the page width, up to 800px (880px on large screens, to fit the Pin buttons),
    // so Clear and Reset sit at the two ends.
    <div className={KAREN_BAR.box}>
        <img src={KAREN_ART.barBackground} alt="" aria-hidden="true" className={KAREN_BAR.mat} />
        <button
          onClick={onClearRecordedData}
          disabled={data.recordedData.length <= 1}
          className={`relative ${KAREN_BAR.word} ${KAREN_BAR.clear}`}
        >
          <TrashIcon />
          Clear Data
        </button>

        <div className="relative order-first w-full xl:order-none xl:w-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
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
              <span className="absolute left-1/2 top-[40px] -translate-x-1/2 -translate-y-1/2 text-white">
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

          {/* Mode switch: one white pill, two parts */}
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
          className={`relative ${KAREN_BAR.word} ${KAREN_BAR.reset}`}
        >
          <RefreshIcon />
          Reset All
        </button>
    </div>
  );
}

export default Controls;
