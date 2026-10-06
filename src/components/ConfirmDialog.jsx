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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 8v5" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      <div className="mt-3 text-sm text-slate-600">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          autoFocus
          onClick={onCancel}
          className="h-8 px-3 rounded-xl text-sm font-bold bg-slate-200 text-slate-800 cursor-pointer hover:bg-slate-300"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="h-8 px-3 rounded-xl text-sm font-bold bg-rose-600 text-white cursor-pointer hover:bg-rose-500"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
