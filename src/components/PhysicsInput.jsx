import { useState } from "react";
import { evaluateNumber } from "../utils/evaluateFormula";
import { KAREN_INPUT, KAREN_NUMBER } from "../styles/karenStyles";

// One input panel: name, number box + unit, slider. Charts tab: vertical
// slider beside its chart. Intro tab (horizontal): left-right slider.
// While the user is typing, the box shows their draft text; otherwise it
// shows the live value. No effect is needed to keep the two in sync.
// readOnly (Playback: only look at the result): the number is plain text in the
// same spot, and the slider still moves with the value but can't be dragged.
function PhysicsInput({ id, label, symbol, unit, value, min, max, color, disabled, readOnly = false, onChange, horizontal = false }) {
  const [draft, setDraft] = useState(null); // null = not typing right now
  const shown = String(Math.round(value * 100) / 100); // 2 decimals
  const text = draft ?? shown;

  // Valid input is sent up; invalid input is simply dropped, so the box
  // falls back to showing the last real value. Unchanged text is skipped,
  // so clicking in and out doesn't round the real value to 2 decimals.
  const commit = (raw) => {
    const evaluated = evaluateNumber(raw);
    if (evaluated !== null && raw !== shown) onChange(evaluated);
    setDraft(null);
  };

  const nameLabel = (
    <label htmlFor={id} className="text-base font-bold" style={{ color }}>
      {label}
    </label>
  );

  // The number box, used by both layouts: the number and the unit inside one beige box.
  // Read-only (Playback): the plain number and unit in the same place, with no box.
  const numberBox = (
    <div className={`${KAREN_NUMBER.box} ${readOnly ? KAREN_NUMBER.plain : KAREN_NUMBER.editable}`}>
      {readOnly ? (
        // Same size and place as the typing box, so nothing moves when the mode changes.
        // aria-live="off": screen readers would otherwise read out every change (60 a second)
        <output id={id} aria-live="off" className={KAREN_NUMBER.number}>
          {shown}
        </output>
      ) : (
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
          className={KAREN_NUMBER.number}
        />
      )}
      <span className={KAREN_NUMBER.unit} style={{ color }}>
        {unit}
      </span>
    </div>
  );

  const slider = (className) => (
    <input
      type="range"
      min={min}
      max={max}
      step={0.1}
      value={value}
      disabled={disabled || readOnly}
      aria-label={`${label} slider`}
      onChange={(e) => onChange(Number(e.target.value))}
      // Read-only: locked but not greyed (it still shows the value). Disabled: greyed.
      className={`${className} ${readOnly ? "cursor-default" : "disabled:opacity-50 disabled:cursor-not-allowed"}`}
      style={{ color }}
    />
  );

  if (horizontal) {
    return (
      // Phones: one line (Stitch look): ● name (x) | -10 | bar | +10 | [number unit].
      // Wider screens: name + box, the bar under them, -10 / 10 under its ends.
      // Same parts for both; only CSS moves them (see KAREN_INPUT), so nothing jumps on first load.
      <div className={KAREN_INPUT.row}>
        <label htmlFor={id} className={KAREN_INPUT.name} style={{ color }}>
          <span className={KAREN_INPUT.dot} style={{ background: color }} />
          {label} <span className={KAREN_INPUT.symbol}>({symbol})</span>
        </label>
        <span className={KAREN_INPUT.min}>{min}</span>
        {slider(`hslider ${KAREN_INPUT.slider}`)}
        <span className={KAREN_INPUT.max}>
          <span className="sm:hidden">+</span>
          {max}
        </span>
        <div className={KAREN_INPUT.box}>{numberBox}</div>
      </div>
    );
  }

  return (
    // Phones: fixed height (the slider needs one). sm and up: fills its row.
    // Short screens (under 600px tall): tighter spacing so 3 rows fit.
    <div className="w-[184px] shrink-0 flex gap-2.5 py-3 [@media(max-height:600px)]:py-1.5 h-24 sm:h-auto">
      {/* flex-1 + min-w-0: same width in every row, so all 3 sliders line up */}
      <div className="flex-1 min-w-0 flex flex-col items-start gap-2 [@media(max-height:600px)]:gap-1.5">
        {nameLabel}
        <div className="self-end">{numberBox}</div>
      </div>
      {/* The slider starts and ends where the plot does: 13px from the row edge
          (panel padding 12 + 1, or on short screens 6 + 7) */}
      <div className="shrink-0 flex gap-1 py-px [@media(max-height:600px)]:py-[7px]">
        <div className="w-7 flex flex-col justify-between items-end text-base leading-none text-gray-600">
          <span>{max}</span>
          <span>{min}</span>
        </div>
        {slider("vslider")}
      </div>
    </div>
  );
}

export default PhysicsInput;
