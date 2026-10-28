/**
 * rateOfChange.js
 *
 * How fast a value changes at time t, found from a function that can be asked
 * for the value at any time. Pure maths: no React, no simulation state.
 */

/**
 * Two photos, one on each side of t, `gap` seconds away:
 * (value after - value before) / (2 * gap). The answer belongs to t itself.
 *
 * Some functions have no value before t (sqrt(t) at t = 0 has none).
 * Then it looks only ahead: (value after - value at t) / gap.
 * The result may still be NaN or Infinity if the function is invalid there.
 */
export function rateOfChange(fn, t, gap) {
  const centered = (fn(t + gap) - fn(t - gap)) / (2 * gap); //centeral difference method MATH
  if (Number.isFinite(centered)) return centered;
  return (fn(t + gap) - fn(t)) / gap;
}
