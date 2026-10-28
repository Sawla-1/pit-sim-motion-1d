import { useRef, useState } from "react";

// Keeps a value between 0 and max (if max is below 0, the panel sits at 0)
const clamp = (value, max) => Math.max(0, Math.min(value, max));

// First spot: just right of the input column, above the toolbar.
// The user can drag it anywhere afterward.
const startPosition = () => ({ x: 200, y: Math.max(8, window.innerHeight - 290) });

const GripIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.8" /><circle cx="15" cy="6" r="1.8" /><circle cx="9" cy="12" r="1.8" /><circle cx="15" cy="12" r="1.8" /><circle cx="9" cy="18" r="1.8" /><circle cx="15" cy="18" r="1.8" /></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
const RunIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l14-8z" /></svg>;
const StopIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>;

// A small window the user can drag by its title bar: a text box for a formula.
// The text and the error come in as props. Only the window position lives here,
// because it matters only on screen. The title and the labels are props too, so
// another simulation can reuse the panel.
// One message line: the error if there is one, otherwise the status
// ({ text, running }; a pulsing dot while running).
// The big button is Run, or Stop while the formula is running (`running`).
function FormulaPanel({ title, label, example, text, error, status, running, runDisabled, onTextChange, onRun, onStop, onClose }) {
  const [pos, setPos] = useState(startPosition);
  const grab = useRef(null); // while dragging: how far the pointer is from the panel's corner
  const panelRef = useRef(null);

  const handlePointerDown = (e) => {
    if (e.target.closest("button")) return; // the Close button is not a handle
    e.currentTarget.setPointerCapture(e.pointerId); // keep getting moves, even outside the bar
    grab.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const handlePointerMove = (e) => {
    if (!grab.current) return;
    const { offsetWidth, offsetHeight } = panelRef.current;
    setPos({
      x: clamp(e.clientX - grab.current.dx, window.innerWidth - offsetWidth),
      y: clamp(e.clientY - grab.current.dy, window.innerHeight - offsetHeight),
    });
  };
  const handlePointerUp = () => { grab.current = null; };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-20 w-[min(300px,calc(100vw-16px))] rounded-2xl border-t-4 border-blue-600 bg-white shadow-xl"
    >
      {/* Title bar: drag here */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing touch-none select-none text-slate-500"
      >
        <GripIcon />
        <h2 className="flex-1 text-sm font-bold text-slate-800">{title}</h2>
        <button
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200"
        >
          <CloseIcon />
        </button>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (!running && !runDisabled) onRun(); }} // Enter runs; it never stops
        className="px-3 pb-3 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="formula-input" className="text-base font-bold text-slate-700 whitespace-nowrap">
            {label}
          </label>
          <input
            id="formula-input"
            type="text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={example}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            className="flex-1 min-w-0 h-9 px-2 border border-gray-400 rounded text-base font-semibold bg-white text-gray-800 shadow-sm focus:outline-none focus:border-gray-700 focus:shadow-[0_0_0_3px_rgba(55,65,81,0.18)]"
          />
        </div>

        <p className="text-sm text-slate-500">
          Use <span className="font-semibold">t</span> for time. Example: <span className="font-mono">{example}</span>
        </p>

        {/* Always takes its space (room for two lines), so the panel does not jump */}
        <p
          role={error ? "alert" : "status"}
          className={`min-h-10 flex items-start gap-2 text-sm font-semibold break-words ${error ? "text-rose-700" : "text-blue-700"}`}
        >
          {!error && status?.running && (
            <span aria-hidden="true" className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
            </span>
          )}
          <span className="min-w-0">{error ?? status?.text}</span>
        </p>

        {/* Run = blue. Stop = rose, like Reset All. Always type="button": if its type
            changed to "submit" in the middle of a Stop click, the browser would then
            submit the form and start Run again. Enter in the box is handled by the form. */}
        <button
          type="button"
          onClick={running ? onStop : onRun}
          disabled={!running && runDisabled}
          className={`h-9 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white cursor-pointer border transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${
            running
              ? "bg-rose-600 border-rose-600 shadow-[0_4px_12px_rgba(225,29,72,0.35)] hover:bg-rose-500 active:bg-rose-700"
              : "bg-blue-600 border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.35)] enabled:hover:bg-blue-500 enabled:active:bg-blue-700"
          }`}
        >
          {running ? <StopIcon /> : <RunIcon />}
          {running ? "Stop" : "Run"}
        </button>
      </form>
    </div>
  );
}

export default FormulaPanel;
