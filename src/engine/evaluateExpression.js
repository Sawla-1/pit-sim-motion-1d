/**
 * Safely evaluates mathematical expressions entered by the user.
 * Returns the numeric result, or null if the expression is invalid.
 */
export function evaluateExpression(expression) {
  try {
    const trimmed = expression.trim();
    if (!trimmed) return null;

    // Reject if any character isn't a number, operator, parenthesis, decimal point, or space
    if (/[^0-9+\-*/().\s]/.test(trimmed)) return null;

    // Use Function constructor for safer evaluation
    const result = new Function('"use strict"; return (' + trimmed + ")")();

    // Validate result is a finite number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}
