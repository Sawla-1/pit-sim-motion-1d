/**
 * evaluateFormula.js
 *
 * Reads a formula typed by the user, like "7 * sin(t) + 2", and turns it into
 * a function of time t. The text is never run as code: it is cut into pieces,
 * every piece is checked against the lists below, and only then is it turned
 * into a function. So only the allowed words and symbols can ever work.
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
const ALLOWED_WORDS = ["t", ...Object.keys(CONSTANTS), ...Object.keys(FUNCTIONS)];

const MULTIPLY_HINT = "Use * for multiply, for example 2*t.";

// Thrown for a formula the user must fix. Its message is shown to the user.
class FormulaError extends Error {}

// Step 1: cut the text into pieces: numbers, words and symbols
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const number = rest.match(/^(\d+\.?\d*|\.\d+)/);
    const word = rest.match(/^[A-Za-z]+/);

    if (/\s/.test(text[i])) {
      i += 1;
    } else if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      i += number[0].length;
    } else if (word) {
      const name = word[0].toLowerCase();
      if (!ALLOWED_WORDS.includes(name)) {
        throw new FormulaError(`I do not know "${word[0]}". You can use: ${ALLOWED_WORDS.join(", ")}.`);
      }
      tokens.push({ type: "word", value: name });
      i += word[0].length;
    } else if ("+-*/^()".includes(text[i])) {
      tokens.push({ type: "symbol", value: text[i] });
      i += 1;
    } else {
      throw new FormulaError(`I do not know the symbol "${text[i]}".`);
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
 *
 * Step 2: read the pieces in the order of school maths. Each reading function
 * returns a small function of t. From weakest to strongest binding:
 *   + -   then   * /   then   minus sign in front   then   ^   then   numbers, t, brackets
 */
export function compileFormula(text) {
  try {
    const tokens = tokenize(text);
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
