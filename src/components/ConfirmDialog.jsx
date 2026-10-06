import { useEffect, useRef } from "react";

// A "Are you sure?" popup. The browser's built-in <dialog> gives us the dark
// background, keyboard focus and the Esc key for free.
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => ref.current.showModal(), []); // opens as soon as it appears

  return (
    <dialog
      ref={ref}
      onCancel={onCancel} // Esc key
      className="m-auto w-[min(90vw,22rem)] rounded-2xl p-4 shadow-xl backdrop:bg-black/50"
    >
      {/* A red circle with "!" next to the title */}
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-600">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M12 8v5" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      <div className="mt-3 text-sm text-slate-600">{message}</div>
      <div className="mt-4 flex justify-end gap-3">
        {/* Secondary: outline only, so it looks quiet */}
        <button
          autoFocus
          onClick={onCancel}
          className="h-9 px-4 rounded-xl text-sm font-semibold bg-white text-slate-700 border border-slate-300 cursor-pointer transition-colors hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100"
        >
          Cancel
        </button>
        {/* Primary: solid red with a soft shadow, so it stands out */}
        <button
          onClick={onConfirm}
          className="h-9 px-4 rounded-xl text-sm font-bold bg-rose-600 text-white border border-rose-600 shadow-[0_4px_12px_rgba(225,29,72,0.35)] cursor-pointer transition-colors hover:bg-rose-500 active:bg-rose-700"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
