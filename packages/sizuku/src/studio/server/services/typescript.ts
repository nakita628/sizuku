import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Semaphore } from "effect";
import type ts from "typescript";
import { declaratorName, exportedDeclarations, parseSource } from "../../../helper/ast.js";
import * as QueryDomain from "../domain/query.js";
import type { Dialect } from "../domain/sql.js";
import { LanguageUnavailableError } from "../errors/index.js";

type TypeScript = typeof ts;

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTypeScript(value: unknown): value is TypeScript {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "createLanguageService") === "function" &&
    typeof Reflect.get(value, "version") === "string"
  );
}

/**
 * The `typescript` directory in the nearest `node_modules` above the schema. Looked up by hand
 * rather than by `require.resolve("typescript")`, which also searches NODE_PATH: pnpm points that
 * at its whole store when it runs a bin, and a TypeScript the project does not have would answer.
 */
function projectTypeScript(schemaPath: string) {
  let dir = path.dirname(path.resolve(schemaPath));
  while (true) {
    const candidate = path.join(dir, "node_modules", "typescript");
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("no node_modules/typescript above the schema");
    dir = parent;
  }
}

/**
 * The project's own `typescript`, resolved from the schema's directory as the project resolves
 * it: the studio ships none, and the schema is checked the way the project checks it.
 */
export function loadTypeScript(schemaPath: string) {
  return Effect.gen(function* () {
    const loaded = yield* Effect.tryPromise({
      try: async (): Promise<unknown> => {
        const resolved = createRequire(schemaPath).resolve(projectTypeScript(schemaPath));
        const namespace: unknown = await import(pathToFileURL(resolved).href);
        return typeof namespace === "object" && namespace !== null && "default" in namespace
          ? namespace.default
          : namespace;
      },
      catch: (error) =>
        new LanguageUnavailableError({
          reason: `Cannot load "typescript" next to ${schemaPath}: ${message(error)}. Install it (npm install -D typescript) for completion in the editor.`,
        }),
    });
    if (!isTypeScript(loaded)) {
      return yield* new LanguageUnavailableError({
        reason:
          "Completion needs a TypeScript with the language service API (5.x or 6.x); TypeScript 7 does not have one yet.",
      });
    }
    return loaded;
  });
}

/** The project's compiler options from the nearest tsconfig.json, or ones that suit a schema file. */
function compilerOptions(typescript: TypeScript, schemaPath: string): ts.CompilerOptions {
  const defaults: ts.CompilerOptions = {
    target: typescript.ScriptTarget.ESNext,
    module: typescript.ModuleKind.ESNext,
    moduleResolution: typescript.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    allowImportingTsExtensions: true,
  };
  const config = typescript.findConfigFile(path.dirname(schemaPath), typescript.sys.fileExists);
  // The query file imports the schema by its `.ts` name; nothing is emitted, so that is allowed.
  if (config === undefined) return { ...defaults, noEmit: true };
  const parsed = typescript.getParsedCommandLineOfConfigFile(
    config,
    {},
    {
      ...typescript.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );
  return { ...(parsed?.options ?? defaults), noEmit: true, allowImportingTsExtensions: true };
}

/** The file a query is checked as: beside the schema, so it imports it and drizzle-orm as the schema does. */
const QUERY_FILE = "__sizuku_query__.ts";

/**
 * A language service over the schema file and a query file beside it. The schema editor's text
 * stands in for the schema on disk (`schema.text`; null reads the file), and the query file is
 * the query with the lines that give it `db` and the tables in front (`query.text`). Every other
 * file, drizzle-orm's types included, is read from disk as the project has it.
 */
function makeService(typescript: TypeScript, schemaPath: string) {
  const file = path.resolve(schemaPath);
  const queryFile = path.join(path.dirname(file), QUERY_FILE);
  const schema: { text: string | null; version: number } = { text: null, version: 0 };
  const query = { text: "", version: 0 };
  const options = compilerOptions(typescript, file);
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [file, queryFile],
    getScriptVersion: (name) =>
      name === file
        ? `${schema.version}:${schema.text === null ? (typescript.sys.getModifiedTime?.(name)?.getTime() ?? 0) : ""}`
        : name === queryFile
          ? String(query.version)
          : String(typescript.sys.getModifiedTime?.(name)?.getTime() ?? 0),
    getScriptSnapshot: (name) => {
      if (name === file && schema.text !== null)
        return typescript.ScriptSnapshot.fromString(schema.text);
      if (name === queryFile) return typescript.ScriptSnapshot.fromString(query.text);
      const text = typescript.sys.readFile(name);
      return text === undefined ? undefined : typescript.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => path.dirname(file),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (settings) => typescript.getDefaultLibFilePath(settings),
    fileExists: (name) => name === queryFile || typescript.sys.fileExists(name),
    readFile: (name, encoding) => typescript.sys.readFile(name, encoding),
    readDirectory: (dir, extensions, exclude, include, depth) =>
      typescript.sys.readDirectory(dir, extensions, exclude, include, depth),
    directoryExists: (dir) => typescript.sys.directoryExists(dir),
    getDirectories: (dir) => typescript.sys.getDirectories(dir),
    realpath: (name) => typescript.sys.realpath?.(name) ?? name,
  };
  const service = typescript.createLanguageService(host, typescript.createDocumentRegistry());
  return { ts: typescript, service, file, queryFile, schema, query };
}

type Service = ReturnType<typeof makeService>;

/** Which text a request is about: the schema in its editor, or a query on the Query page. */
export type DocumentKind = "schema" | "query";

/** The names a schema exports, in file order. */
export function schemaExports(source: string) {
  const { program } = parseSource(source.split("\n"));
  return exportedDeclarations(program)
    .map(({ declarator }) => declaratorName(declarator))
    .filter((name): name is string => name !== null);
}

/**
 * The editor's TypeScript, loaded the first time it is asked for and kept: the project's own
 * `typescript` over the schema file and the query file, with drizzle-orm's types as installed.
 * `dialect` is the database's, for a schema whose builders do not say.
 */
export function createLanguage(input: {
  readonly schemaPath: string;
  readonly dialect: Dialect | null;
}) {
  const lock = Semaphore.makeUnsafe(1);
  const holder: { loaded: Service | null } = { loaded: null };

  const load = Effect.gen(function* () {
    if (holder.loaded !== null) return holder.loaded;
    const typescript = yield* loadTypeScript(input.schemaPath);
    holder.loaded = makeService(typescript, input.schemaPath);
    return holder.loaded;
  }).pipe(Semaphore.withPermit(lock));

  /** The query file's text: the lines in front, the query, and the brace that closes it. */
  function queryText(loaded: Service, code: string) {
    const source = loaded.ts.sys.readFile(loaded.file) ?? "";
    const dialect = QueryDomain.makeSchemaDialect({ source }) ?? input.dialect ?? "postgresql";
    const { preamble, suffix } = QueryDomain.makeTypePreamble({
      dialect,
      schemaImport: `./${path.basename(loaded.file)}`,
      names: schemaExports(source),
    });
    return { text: `${preamble}${code}${suffix}`, base: preamble.length };
  }

  /**
   * Puts the text in place and asks about it in one synchronous step, so two requests that
   * arrive together (completion and signature help on one keystroke) cannot swap their texts
   * between the other's edit and question. A query is checked against the saved schema.
   */
  function ask<T>(
    document: DocumentKind,
    text: string,
    offset: number,
    question: (context: {
      readonly loaded: Service;
      readonly target: string;
      readonly base: number;
      readonly length: number;
      readonly position: number;
    }) => T,
  ) {
    return Effect.gen(function* () {
      const loaded = yield* load;
      return yield* Effect.sync(() => {
        const schemaText = document === "schema" ? text : null;
        if (loaded.schema.text !== schemaText) {
          loaded.schema.text = schemaText;
          loaded.schema.version += 1;
        }
        const placed = document === "query" ? queryText(loaded, text) : { text, base: 0 };
        if (document === "query" && loaded.query.text !== placed.text) {
          loaded.query.text = placed.text;
          loaded.query.version += 1;
        }
        return question({
          loaded,
          target: document === "query" ? loaded.queryFile : loaded.file,
          base: placed.base,
          length: text.length,
          position: placed.base + Math.max(0, Math.min(offset, text.length)),
        });
      });
    });
  }

  /** A span of the target file as one of the text the editor sent, or null outside it. */
  function local(
    span: { readonly start: number; readonly length: number },
    base: number,
    length: number,
  ) {
    const start = span.start - base;
    const end = start + span.length;
    return start < 0 || end > length ? null : { start, end };
  }

  return {
    typescript: load.pipe(Effect.map((loaded) => loaded.ts)),

    status: load.pipe(
      Effect.match({
        onFailure: (error) => ({ typescript: null, reason: error.reason }),
        onSuccess: (loaded) => ({ typescript: loaded.ts.version, reason: null }),
      }),
    ),

    complete(document: DocumentKind, text: string, offset: number) {
      return ask(document, text, offset, ({ loaded, target, base, length, position }) => {
        const found = loaded.service.getCompletionsAtPosition(target, position, {
          includeCompletionsWithInsertText: true,
          includeCompletionsForModuleExports: false,
        });
        return {
          items: (found?.entries ?? [])
            .filter((entry) => !entry.name.startsWith("__"))
            .map((entry) => ({
              label: entry.name,
              kind: entry.kind,
              sortText: entry.sortText,
              insertText: entry.insertText ?? null,
              replacement: entry.replacementSpan
                ? local(entry.replacementSpan, base, length)
                : null,
            })),
        };
      });
    },

    detail(document: DocumentKind, text: string, offset: number, name: string) {
      return ask(document, text, offset, ({ loaded, target, position }) => {
        const found = loaded.service.getCompletionEntryDetails(
          target,
          position,
          name,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        if (found === undefined) return { detail: null, documentation: null };
        const documentation = loaded.ts.displayPartsToString(found.documentation);
        return {
          detail: loaded.ts.displayPartsToString(found.displayParts) || null,
          documentation: documentation === "" ? null : documentation,
        };
      });
    },

    hover(document: DocumentKind, text: string, offset: number) {
      return ask(document, text, offset, ({ loaded, target, base, length, position }) => {
        const info = loaded.service.getQuickInfoAtPosition(target, position);
        const range = info ? local(info.textSpan, base, length) : null;
        if (info === undefined || range === null) return { contents: null, range: null };
        const signature = loaded.ts.displayPartsToString(info.displayParts);
        const documentation = loaded.ts.displayPartsToString(info.documentation);
        return {
          contents: [
            `\`\`\`typescript\n${signature}\n\`\`\``,
            ...(documentation === "" ? [] : [documentation]),
          ].join("\n\n"),
          range,
        };
      });
    },

    signature(document: DocumentKind, text: string, offset: number) {
      return ask(document, text, offset, ({ loaded, target, position }) => {
        const help = loaded.service.getSignatureHelpItems(target, position, undefined);
        if (help === undefined) return { signatures: [], activeSignature: 0, activeParameter: 0 };
        const parts = loaded.ts.displayPartsToString;
        return {
          signatures: help.items.map((item) => {
            const parameters = item.parameters.map((parameter) => ({
              label: parts(parameter.displayParts),
              documentation: parts(parameter.documentation) || null,
            }));
            return {
              label: `${parts(item.prefixDisplayParts)}${parameters.map((p) => p.label).join(parts(item.separatorDisplayParts))}${parts(item.suffixDisplayParts)}`,
              documentation: parts(item.documentation) || null,
              parameters,
            };
          }),
          activeSignature: help.selectedItemIndex,
          activeParameter: help.argumentIndex,
        };
      });
    },

    /**
     * The type errors of the text. For the schema only the semantic ones: its syntax errors are
     * the parser's, shown with the diagram. A query has no parser of its own, so both.
     */
    diagnostics(document: DocumentKind, text: string) {
      return ask(document, text, 0, ({ loaded, target, base, length }) => {
        const typescript = loaded.ts;
        const found = [
          ...(document === "query" ? loaded.service.getSyntacticDiagnostics(target) : []),
          ...loaded.service.getSemanticDiagnostics(target),
        ];
        return {
          diagnostics: found
            .flatMap((diagnostic) => {
              if (diagnostic.start === undefined) return [];
              const range = local(
                { start: diagnostic.start, length: diagnostic.length ?? 0 },
                base,
                length,
              );
              if (range === null) return [];
              const severity =
                diagnostic.category === typescript.DiagnosticCategory.Error
                  ? ("error" as const)
                  : diagnostic.category === typescript.DiagnosticCategory.Warning
                    ? ("warning" as const)
                    : ("info" as const);
              return [
                {
                  message: typescript.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
                  severity,
                  range,
                },
              ];
            })
            .toSorted((a, b) => a.range.start - b.range.start),
        };
      });
    },
  };
}

export type Language = ReturnType<typeof createLanguage>;
