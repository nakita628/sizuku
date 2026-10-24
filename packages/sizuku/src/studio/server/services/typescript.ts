import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Semaphore } from "effect";
import type ts from "typescript";
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
function loadTypeScript(schemaPath: string) {
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
  if (config === undefined) return { ...defaults, noEmit: true };
  const parsed = typescript.getParsedCommandLineOfConfigFile(
    config,
    {},
    {
      ...typescript.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );
  return { ...(parsed?.options ?? defaults), noEmit: true };
}

/**
 * A language service over the schema file. The editor's text stands in for the file on disk
 * (`cell`), so what is asked about is what is on screen, saved or not; every other file, the
 * schema's own imports and drizzle-orm's types included, is read from disk as the project has it.
 */
function makeService(typescript: TypeScript, schemaPath: string) {
  const file = path.resolve(schemaPath);
  const cell = { text: "", version: 0 };
  const options = compilerOptions(typescript, file);
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [file],
    getScriptVersion: (name) =>
      name === file
        ? String(cell.version)
        : String(typescript.sys.getModifiedTime?.(name)?.getTime() ?? 0),
    getScriptSnapshot: (name) => {
      if (name === file) return typescript.ScriptSnapshot.fromString(cell.text);
      const text = typescript.sys.readFile(name);
      return text === undefined ? undefined : typescript.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => path.dirname(file),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (settings) => typescript.getDefaultLibFilePath(settings),
    fileExists: (name) => typescript.sys.fileExists(name),
    readFile: (name, encoding) => typescript.sys.readFile(name, encoding),
    readDirectory: (dir, extensions, exclude, include, depth) =>
      typescript.sys.readDirectory(dir, extensions, exclude, include, depth),
    directoryExists: (dir) => typescript.sys.directoryExists(dir),
    getDirectories: (dir) => typescript.sys.getDirectories(dir),
    realpath: (name) => typescript.sys.realpath?.(name) ?? name,
  };
  const service = typescript.createLanguageService(host, typescript.createDocumentRegistry());
  return { ts: typescript, service, file, cell };
}

type Service = ReturnType<typeof makeService>;

/**
 * The editor's TypeScript, loaded the first time it is asked for and kept: the project's own
 * `typescript` over the schema file, with drizzle-orm's types as installed.
 */
export function createLanguage(input: { readonly schemaPath: string }) {
  const lock = Semaphore.makeUnsafe(1);
  const holder: { loaded: Service | null } = { loaded: null };

  const load = Effect.gen(function* () {
    if (holder.loaded !== null) return holder.loaded;
    const typescript = yield* loadTypeScript(input.schemaPath);
    holder.loaded = makeService(typescript, input.schemaPath);
    return holder.loaded;
  }).pipe(Semaphore.withPermit(lock));

  /**
   * Puts the text in place and asks about it in one synchronous step, so two requests that
   * arrive together (completion and signature help on one keystroke) cannot swap their texts
   * between the other's edit and question.
   */
  function ask<T>(
    text: string,
    offset: number,
    question: (service: Service, position: number) => T,
  ) {
    return Effect.gen(function* () {
      const loaded = yield* load;
      return yield* Effect.sync(() => {
        if (loaded.cell.text !== text) {
          loaded.cell.text = text;
          loaded.cell.version += 1;
        }
        return question(loaded, Math.max(0, Math.min(offset, text.length)));
      });
    });
  }

  return {
    status: load.pipe(
      Effect.match({
        onFailure: (error) => ({ typescript: null, reason: error.reason }),
        onSuccess: (loaded) => ({ typescript: loaded.ts.version, reason: null }),
      }),
    ),

    complete(text: string, offset: number) {
      return ask(text, offset, ({ service, file }, position) => {
        const found = service.getCompletionsAtPosition(file, position, {
          includeCompletionsWithInsertText: true,
          includeCompletionsForModuleExports: false,
        });
        return {
          items: (found?.entries ?? []).map((entry) => ({
            label: entry.name,
            kind: entry.kind,
            sortText: entry.sortText,
            insertText: entry.insertText ?? null,
            replacement: entry.replacementSpan
              ? {
                  start: entry.replacementSpan.start,
                  end: entry.replacementSpan.start + entry.replacementSpan.length,
                }
              : null,
          })),
        };
      });
    },

    detail(text: string, offset: number, name: string) {
      return ask(text, offset, ({ ts: typescript, service, file }, position) => {
        const found = service.getCompletionEntryDetails(
          file,
          position,
          name,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        if (found === undefined) return { detail: null, documentation: null };
        const documentation = typescript.displayPartsToString(found.documentation);
        return {
          detail: typescript.displayPartsToString(found.displayParts) || null,
          documentation: documentation === "" ? null : documentation,
        };
      });
    },

    hover(text: string, offset: number) {
      return ask(text, offset, ({ ts: typescript, service, file }, position) => {
        const info = service.getQuickInfoAtPosition(file, position);
        if (info === undefined) return { contents: null, range: null };
        const signature = typescript.displayPartsToString(info.displayParts);
        const documentation = typescript.displayPartsToString(info.documentation);
        return {
          contents: [
            `\`\`\`typescript\n${signature}\n\`\`\``,
            ...(documentation === "" ? [] : [documentation]),
          ].join("\n\n"),
          range: { start: info.textSpan.start, end: info.textSpan.start + info.textSpan.length },
        };
      });
    },

    signature(text: string, offset: number) {
      return ask(text, offset, ({ ts: typescript, service, file }, position) => {
        const help = service.getSignatureHelpItems(file, position, undefined);
        if (help === undefined) return { signatures: [], activeSignature: 0, activeParameter: 0 };
        const parts = typescript.displayPartsToString;
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

    /** The type errors; the syntax errors are the parser's, shown with the diagram. */
    diagnostics(text: string) {
      return ask(text, 0, ({ ts: typescript, service, file }) => ({
        diagnostics: service
          .getSemanticDiagnostics(file)
          .flatMap((diagnostic) => {
            if (diagnostic.start === undefined) return [];
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
                range: {
                  start: diagnostic.start,
                  end: diagnostic.start + (diagnostic.length ?? 0),
                },
              },
            ];
          })
          .toSorted((a, b) => a.range.start - b.range.start),
      }));
    },
  };
}

export type Language = ReturnType<typeof createLanguage>;
