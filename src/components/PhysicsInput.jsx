import { useState } from "react";
import { evaluateExpression } from "../engine/evaluateExpression";

// One input panel beside its chart: name, number box + unit, vertical slider.
// While the user is typing, the box shows their draft text; otherwise it
// shows the live value. No effect is needed to keep the two in sync.
function PhysicsInput({ id, label, unit, value, min, max, color, track, disabled, onChange }) {
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
    // Phones: fixed height (the slider needs one). sm and up: fills its row.
    // Short screens (under 600px tall): tighter spacing so 3 rows fit.
    <div className="w-[184px] shrink-0 sm:ml-4 flex gap-2.5 py-3 [@media(max-height:600px)]:py-1.5 h-24 sm:h-auto">
      {/* flex-1 + min-w-0: same width in every row, so all 3 sliders line up */}
      <div className="flex-1 min-w-0 flex flex-col items-start gap-2 [@media(max-height:600px)]:gap-1.5">
        <label htmlFor={id} className="text-base font-bold" style={{ color }}>
          {label}
        </label>
        <div className="self-end flex items-center gap-2 whitespace-nowrap">
          <input
            id={id}
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
            className="w-[72px] h-8 px-2 border border-gray-400 rounded text-base font-semibold text-right bg-white text-gray-800 shadow-sm focus:outline-none focus:border-gray-700 focus:shadow-[0_0_0_3px_rgba(55,65,81,0.18)] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="w-[34px] text-base font-semibold" style={{ color }}>
            {unit}
          </span>
        </div>
      </div>
      {/* The slider starts and ends where the plot does: 19px from the row edge
          (panel padding 12 + 7, or on short screens 6 + 13) */}
      <div className="shrink-0 flex gap-1 py-[7px] [@media(max-height:600px)]:py-[13px]">
        <div className="w-7 flex flex-col justify-between items-end text-base leading-none text-gray-600">
          <span>{max}</span>
          <span>{min}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value}
          disabled={disabled}
          aria-label={`${label} slider`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="vslider disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color, background: track }}
        />
      </div>
    </div>
  );
}

export default PhysicsInput;
