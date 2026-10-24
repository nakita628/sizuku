import path from "node:path";
import { Effect } from "effect";
import { format } from "oxfmt";
import { FormatError } from "../errors/index.js";
import { readTextIfExists, writeText } from "./file.js";

/** The oxfmt options the studio lets you set. */
export type FormatOptions = {
  readonly printWidth?: number;
  readonly tabWidth?: number;
  readonly useTabs?: boolean;
  readonly semi?: boolean;
  readonly singleQuote?: boolean;
  readonly trailingComma?: "all" | "es5" | "none";
  readonly bracketSpacing?: boolean;
  readonly arrowParens?: "always" | "avoid";
};

const CONFIG_FILES = [".oxfmtrc.json", ".oxfmtrc.jsonc"] as const;
const OPTION_KEYS = [
  "printWidth",
  "tabWidth",
  "useTabs",
  "semi",
  "singleQuote",
  "trailingComma",
  "bracketSpacing",
  "arrowParens",
] as const;

/** JSON with its `//` and `/* *\/` comments removed, strings left as they are. */
export function stripJsonComments(text: string) {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      const start = i;
      i++;
      while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
      out.push(text.slice(start, i + 1));
      i++;
    } else if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out.push(ch);
      i++;
    }
  }
  // A trailing comma is legal in JSONC and not in JSON.
  return out.join("").replace(/,(\s*[}\]])/gu, "$1");
}

function pickOptions(value: unknown): FormatOptions {
  if (typeof value !== "object" || value === null) return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    OPTION_KEYS.filter((key) => record[key] !== undefined).map((key) => [key, record[key]]),
  );
}

/** The nearest `.oxfmtrc.json(c)` from the schema's directory upwards, as oxfmt itself looks for it. */
function findConfig(from: string) {
  return Effect.gen(function* () {
    let dir = path.resolve(from);
    while (true) {
      for (const name of CONFIG_FILES) {
        const file = path.join(dir, name);
        const text = yield* readTextIfExists(file);
        if (text !== null) return { path: file, text };
      }
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  });
}

function parseConfig(config: { readonly path: string; readonly text: string }) {
  return Effect.try({
    try: (): unknown => JSON.parse(stripJsonComments(config.text)),
    catch: (error) =>
      new FormatError({
        message: `${config.path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      }),
  });
}

/** The formatter options in effect for the schema, and the file they come from. */
export function readSettings(input: { readonly schemaPath: string }) {
  return Effect.gen(function* () {
    const config = yield* findConfig(path.dirname(input.schemaPath));
    if (config === null) return { options: {}, configPath: null };
    return { options: pickOptions(yield* parseConfig(config)), configPath: config.path };
  });
}

/**
 * Writes the options into the config oxfmt would read, keeping its other settings; with none
 * yet, a new `.oxfmtrc.json` in the working directory.
 */
export function writeSettings(input: {
  readonly schemaPath: string;
  readonly cwd: string;
  readonly options: FormatOptions;
}) {
  return Effect.gen(function* () {
    const config = yield* findConfig(path.dirname(input.schemaPath));
    const existing = config === null ? {} : yield* parseConfig(config);
    const base = typeof existing === "object" && existing !== null ? existing : {};
    const rest = Object.fromEntries(
      Object.entries(base).filter(([key]) => !(OPTION_KEYS as readonly string[]).includes(key)),
    );
    const file = config?.path ?? path.join(input.cwd, ".oxfmtrc.json");
    yield* writeText(file, `${JSON.stringify({ ...rest, ...input.options }, null, 2)}\n`);
    return { options: input.options, configPath: file };
  });
}

export function formatSource(input: { readonly source: string; readonly options: FormatOptions }) {
  return Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: () => format("schema.ts", input.source, input.options),
      catch: (error) =>
        new FormatError({ message: error instanceof Error ? error.message : String(error) }),
    });
    if (result.errors.length > 0) {
      return yield* new FormatError({ message: result.errors.map((e) => e.message).join("\n") });
    }
    return result.code;
  });
}
