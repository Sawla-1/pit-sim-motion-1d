/**
 * formulaMotion.js
 *
 * Motion from a formula: the student gives position as a function of time,
 * and velocity and acceleration are worked out from it. Pure maths only.
 */

import { rateOfChange } from "./rateOfChange";

// Seconds between the two "photos" of rateOfChange. Small and fixed, so the
// answer does not depend on how long a frame took.
const RATE_GAP = 0.001;

// A speed that cannot be found (a formula that is invalid right next to this
// moment) is shown as 0 instead of stopping the whole run.
const finiteOrZero = (value) => (Number.isFinite(value) ? value : 0);

/**
 * One step of formula motion, called once per animation frame.
 * `evaluate(t)` is the position formula. Position comes straight from it;
 * velocity is its rate of change, acceleration is the rate of change of that.
 * Returns null when the formula gives no number for this time (like 1/t at t = 0).
 */
export function calculateFormulaStep(evaluate, simulation, deltaTime) {
  const time = simulation.time + deltaTime;

  const position = evaluate(time);
  if (!Number.isFinite(position)) return null;

  const velocityAt = (t) => rateOfChange(evaluate, t, RATE_GAP);
  const velocity = finiteOrZero(velocityAt(time));
  const acceleration = finiteOrZero(rateOfChange(velocityAt, time, RATE_GAP));

  return { position, velocity, acceleration, time };
}
