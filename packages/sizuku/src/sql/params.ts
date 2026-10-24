import { tokenize } from "./tokenize.js";

/**
 * The values each statement of a text binds, when they are given once for the whole text: the
 * `?` placeholders take the next values in turn, statement after statement, and a statement of
 * `$1`, `$2`, ... takes the values up to the highest number it uses. A statement without a
 * placeholder binds nothing, which is what a driver asks of it.
 *
 * @param statements - the statements of the text, in order
 * @param params - the values, in the order the placeholders of the whole text ask for them
 * @returns one list of values per statement
 */
export function paramsByStatement<T>(statements: readonly string[], params: readonly T[]) {
  let next = 0;
  return statements.map((statement) => {
    const result = tokenize(statement);
    const placeholders = result.ok ? result.tokens.filter((token) => token.kind === "param") : [];
    const numbered = placeholders.flatMap((token) => {
      const match = /^\$(\d+)$/u.exec(token.raw);
      return match === null ? [] : [Number(match[1])];
    });
    if (numbered.length > 0) return params.slice(0, Math.max(...numbered));
    const count = placeholders.filter((token) => token.raw === "?").length;
    const taken = params.slice(next, next + count);
    next += count;
    return taken;
  });
}
