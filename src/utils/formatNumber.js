/**
 * Formats a number to the given number of decimal places.
 * Returns "0" for non-finite values.
 */
export function formatNumber(n, decimals) {
  return Number.isFinite(Number(n)) ? Number(n).toFixed(decimals) : "0";
}
