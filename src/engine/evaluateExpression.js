/**
 * Safely evaluates mathematical expressions entered by the user.
 * Returns the numeric result, or null if the expression is invalid.
 */
export function evaluateExpression(expression) {
  try {
    const trimmed = expression.trim();
    if (!trimmed) return null;

    // Remove any non-math characters except numbers, operators, parentheses, decimal points, and spaces
    const cleaned = trimmed.replace(/[^0-9+\-*/().\s]/g, "");
    if (!cleaned) return null;

    // Use Function constructor for safer evaluation
    const result = new Function('"use strict"; return (' + cleaned + ")")();

    // Validate result is a finite number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}
