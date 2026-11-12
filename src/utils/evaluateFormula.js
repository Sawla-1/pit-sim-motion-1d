/**
 * evaluateFormula.js
 *
 * Reads a formula typed by the user, like "7 * sin(t) + 2", and turns it into
 * a function of time t. The text is never run as code: it is cut into pieces,
 * every piece is checked against the lists below, and only then is it turned
 * into a function. So only the allowed words and symbols can ever work.
 *
 * It also reads plain maths typed in a number box, like "1+2" (evaluateNumber).
 */

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
};
const CONSTANTS = { pi: Math.PI, e: Math.E };
// The words a formula may use (the Formula panel)
const FORMULA_WORDS = ["t", ...Object.keys(CONSTANTS), ...Object.keys(FUNCTIONS)];

const MULTIPLY_HINT = "Use * for multiply, for example 2*t.";

// Thrown for a formula the user must fix. Its message is shown to the user.
class FormulaError extends Error {}

// Step 1: cut the text into pieces: numbers, words and symbols.
// `words` = the words the text may use.
function tokenize(text, words) {
  const tokens = [];
  // One piece at a time: a number, a word, or any other single character (spaces are skipped)
  for (const [piece] of text.matchAll(/\d+\.?\d*|\.\d+|[A-Za-z]+|\S/g)) {
    if (/^\.?\d/.test(piece)) {
      tokens.push({ type: "number", value: Number(piece) });
    } else if (/^[A-Za-z]/.test(piece)) {
      const name = piece.toLowerCase();
      if (!words.includes(name)) {
        throw new FormulaError(`I do not know "${piece}". You can use: ${words.join(", ")}.`);
      }
      tokens.push({ type: "word", value: name });
    } else if ("+-*/^()".includes(piece)) {
      tokens.push({ type: "symbol", value: piece });
    } else {
      throw new FormulaError(`I do not know the symbol "${piece}".`);
    }
  }
  return tokens;
}

// A piece that starts a new value: a number, a word or "("
const startsValue = (token) =>
  token !== undefined && (token.type !== "symbol" || token.value === "(");

/**
 * Turns formula text into { ok: true, evaluate } where evaluate(t) gives the
 * position at time t, or { ok: false, error } with a message for the user.
 * `words` = the words the text may use (left out: all the formula words).
 *
 * Step 2: read the pieces in the order of school maths. Each reading function
 * returns a small function of t. From weakest to strongest binding:
 *   + -   then   * /   then   minus sign in front   then   ^   then   numbers, t, brackets
 */
export function compileFormula(text, words = FORMULA_WORDS) {
  try {
    const tokens = tokenize(text, words);
    if (tokens.length === 0) throw new FormulaError("Type a formula first.");

    let pos = 0;
    const peek = () => tokens[pos];
    const isSymbol = (token, symbol) => token?.type === "symbol" && token.value === symbol;

    const readSum = () => {
      let left = readProduct();
      while (isSymbol(peek(), "+") || isSymbol(peek(), "-")) {
        const plus = tokens[pos++].value === "+";
        const before = left; // keep this one: `left` is replaced on the next line
        const right = readProduct();
        left = plus ? (t) => before(t) + right(t) : (t) => before(t) - right(t);
      }
      return left;
    };

    const readProduct = () => {
      let left = readSigned();
      while (isSymbol(peek(), "*") || isSymbol(peek(), "/")) {
        const times = tokens[pos++].value === "*";
        const before = left;
        const right = readSigned();
        left = times ? (t) => before(t) * right(t) : (t) => before(t) / right(t);
      }
      return left;
    };

    // A minus sign in front: -t^2 means -(t^2), like on paper
    const readSigned = () => {
      if (isSymbol(peek(), "-")) {
        pos += 1;
        const inner = readSigned();
        return (t) => -inner(t);
      }
      if (isSymbol(peek(), "+")) {
        pos += 1;
        return readSigned();
      }
      return readPower();
    };

    // t^2: the power is read to the right, so 2^3^2 means 2^(3^2), like on paper
    const readPower = () => {
      const base = readAtom();
      if (!isSymbol(peek(), "^")) return base;
      pos += 1;
      const exponent = readSigned();
      return (t) => Math.pow(base(t), exponent(t));
    };

    const readAtom = () => {
      const token = tokens[pos++];
      if (token === undefined) throw new FormulaError("The formula stops too early.");

      if (token.type === "number") return () => token.value;
      if (isSymbol(token, "(")) return readInsideBrackets();
      if (token.type === "word") {
        if (token.value === "t") return (t) => t;
        if (token.value in CONSTANTS) return () => CONSTANTS[token.value];
        if (!isSymbol(peek(), "(")) {
          throw new FormulaError(`Write ${token.value} with brackets, for example ${token.value}(t).`);
        }
        pos += 1;
        const argument = readInsideBrackets();
        const fn = FUNCTIONS[token.value];
        return (t) => fn(argument(t));
      }
      throw new FormulaError(`I could not read the formula near "${token.value}".`);
    };

    // Reads up to the closing bracket (the opening one is already read)
    const readInsideBrackets = () => {
      const inner = readSum();
      if (startsValue(peek())) throw new FormulaError(MULTIPLY_HINT);
      if (!isSymbol(peek(), ")")) throw new FormulaError("A bracket is not closed. Add a )");
      pos += 1;
      return inner;
    };

    const evaluate = readSum();
    if (pos < tokens.length) {
      if (startsValue(peek())) throw new FormulaError(MULTIPLY_HINT);
      if (isSymbol(peek(), ")")) throw new FormulaError("There is an extra ).");
      throw new FormulaError(`I could not read the formula near "${peek().value}".`);
    }
    return { ok: true, evaluate };
  } catch (error) {
    if (error instanceof FormulaError) return { ok: false, error: error.message };
    throw error; // a real bug, not a typing mistake: do not hide it
  }
}

/**
 * Reads plain maths typed in a number box, like "1+2" or "pi/2".
 * Returns the number, or null if it cannot be read.
 */
export function evaluateNumber(text) {
  try {
    // No words allowed: a number box takes numbers and symbols only
    const compiled = compileFormula(text, []);
    const value = compiled.ok ? compiled.evaluate() : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null; // text too long or too deep to read: refuse it
  }
}
