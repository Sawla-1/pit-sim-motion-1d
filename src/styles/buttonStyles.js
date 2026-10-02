// Shared button looks, used by the chart buttons and the bottom bar.

// "On" look: white, thin grey border, soft shadow, dark slate icon
export const whiteLook = "bg-white border border-[#d9dee6] text-slate-700 shadow-sm";

// "Off" look for every button: grey, flat (no shadow), "not allowed" cursor
const disabledLook = "disabled:bg-gray-200 disabled:border-gray-300 disabled:shadow-none disabled:cursor-not-allowed";
// Icon buttons: pale icon (still visible)
export const disabledIcon = `${disabledLook} disabled:text-gray-400`;
// Word buttons: mid grey word (still readable)
export const disabledText = `${disabledLook} disabled:text-gray-500`;

// Same "off" greys for a wrapper <div> (a div can't be disabled, so no "disabled:" here)
export const offPill = "bg-gray-200 border border-gray-300 divide-gray-300";
