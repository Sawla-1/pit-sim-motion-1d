/**
 * Returns the smallest round step (1, 2, 5, 10, 20, 50, ...) that splits
 * `range` into at most `maxCount` pieces.
 */
export function niceStep(range, maxCount) {
  const rough = range / maxCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  // 10 is included because log10 can land just below a whole power of ten.
  return [1, 2, 5, 10].map((m) => m * magnitude).find((step) => step >= rough);
}
