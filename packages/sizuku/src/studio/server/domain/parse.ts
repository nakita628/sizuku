import { parseSync } from "oxc-parser";

/** The 1-based line and column a UTF-16 offset of `source` falls on. */
export function makePosition(input: { readonly source: string; readonly offset: number }) {
  const before = input.source.slice(0, input.offset).split("\n");
  return { line: before.length, column: (before.at(-1)?.length ?? 0) + 1 };
}

/** The first syntax error of a schema source, or null when it parses. */
export function makeParseError(input: { readonly source: string }) {
  const { errors } = parseSync("schema.ts", input.source, { lang: "ts", sourceType: "module" });
  const [first] = errors;
  if (first === undefined) return null;
  const position = makePosition({ source: input.source, offset: first.labels[0]?.start ?? 0 });
  return { message: first.message, ...position };
}
