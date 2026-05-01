import { readFileSync } from "../fsp/index.js";
import { sizukuArktype } from "../generator/arktype/index.js";
import { sizukuDbml } from "../generator/dbml/index.js";
import { sizukuEffect } from "../generator/effect/index.js";
import { sizukuMermaidER } from "../generator/mermaid-er/index.js";
import { sizukuValibot } from "../generator/valibot/index.js";
import { sizukuZod } from "../generator/zod/index.js";

const HELP_TEXT = `💧 sizuku - Drizzle ORM schema tools

Usage:
  sizuku <input> -o <output> [options]

Options:
  -o <path>                         Output file path
  --zod                             Generate Zod validation schema
  --valibot                         Generate Valibot validation schema
  --arktype                         Generate ArkType validation schema
  --effect                          Generate Effect Schema validation schema
  --zod-version <version>           Zod variant: 'v4' | 'mini' | '@hono/zod-openapi'
  --no-export-types                 Do not export inferred types
  --no-with-comment                 Do not add JSDoc comments
  --no-with-relation                Do not generate relation schemas
  -h, --help                        Display this help message`;

export function detectOutputType(output: string) {
  if (output.endsWith(".dbml")) return "dbml" as const;
  if (output.endsWith(".png")) return "png" as const;
  if (output.endsWith(".md")) return "mermaid" as const;
  if (output.endsWith(".ts")) return "typescript" as const;
  return null;
}

export function parseFlags(argv: readonly string[]) {
  const ZOD_VERSIONS = ["v4", "mini", "@hono/zod-openapi"] as const;
  const zodVersionIndex = argv.findIndex(
    (a) => a === "--zod-version" || a.startsWith("--zod-version="),
  );
  const zodVersionValue =
    zodVersionIndex === -1
      ? undefined
      : argv[zodVersionIndex].includes("=")
        ? argv[zodVersionIndex].split("=")[1]
        : argv[zodVersionIndex + 1];

  return {
    zod: argv.includes("--zod"),
    valibot: argv.includes("--valibot"),
    arktype: argv.includes("--arktype"),
    effect: argv.includes("--effect"),
    zodVersion: ZOD_VERSIONS.find((v) => v === zodVersionValue),
    exportTypes: !argv.includes("--no-export-types"),
    withComment: !argv.includes("--no-with-comment"),
    withRelation: !argv.includes("--no-with-relation"),
  };
}

export function stripImports(content: string) {
  const lines = content.split("\n");
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith("import") && line.trim() !== "",
  );
  return lines.slice(codeStart);
}

export function resolveSchemaLibrary(flags: {
  readonly zod: boolean;
  readonly valibot: boolean;
  readonly arktype: boolean;
  readonly effect: boolean;
}) {
  if (flags.zod) return { name: "zod", label: "Zod" } as const;
  if (flags.valibot) return { name: "valibot", label: "Valibot" } as const;
  if (flags.arktype) return { name: "arktype", label: "ArkType" } as const;
  if (flags.effect) return { name: "effect", label: "Effect" } as const;
  return null;
}

async function sizukuDirectDiagram(
  input: string,
  output: string,
  outputType: "dbml" | "png" | "mermaid",
) {
  const contentResult = readFileSync(input);
  if (!contentResult.ok) {
    return { ok: false, error: `Failed to read input: ${contentResult.error}` } as const;
  }

  const code = stripImports(contentResult.value);

  if (outputType === "dbml" || outputType === "png") {
    const result = await sizukuDbml(code, output);
    if (!result.ok) return result;
    const label = outputType === "png" ? "PNG" : "DBML";
    return { ok: true, value: `💧 Generated ${label} at: ${output}` } as const;
  }

  const result = await sizukuMermaidER(code, output);
  if (!result.ok) return result;
  return { ok: true, value: `💧 Generated Mermaid ER at: ${output}` } as const;
}

async function sizukuDirectSchema(
  input: string,
  output: string,
  flags: {
    readonly zod: boolean;
    readonly valibot: boolean;
    readonly arktype: boolean;
    readonly effect: boolean;
    readonly zodVersion: "v4" | "mini" | "@hono/zod-openapi" | undefined;
    readonly exportTypes: boolean;
    readonly withComment: boolean;
    readonly withRelation: boolean;
  },
) {
  const lib = resolveSchemaLibrary(flags);
  if (!lib) {
    return {
      ok: false,
      error: "Specify --zod, --valibot, --arktype, or --effect for .ts output",
    } as const;
  }

  const contentResult = readFileSync(input);
  if (!contentResult.ok) {
    return { ok: false, error: `Failed to read input: ${contentResult.error}` } as const;
  }

  const code = stripImports(contentResult.value);

  const result = await (() => {
    if (lib.name === "zod") {
      return sizukuZod(
        code,
        output,
        flags.withComment,
        flags.exportTypes,
        flags.zodVersion,
        flags.withRelation,
      );
    }
    if (lib.name === "valibot") {
      return sizukuValibot(code, output, flags.withComment, flags.exportTypes, flags.withRelation);
    }
    if (lib.name === "arktype") {
      return sizukuArktype(code, output, flags.withComment, flags.exportTypes, flags.withRelation);
    }
    return sizukuEffect(code, output, flags.withComment, flags.exportTypes, flags.withRelation);
  })();

  if (!result.ok) return result;
  return { ok: true, value: `💧 Generated ${lib.label} schema at: ${output}` } as const;
}

export async function sizuku() {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { ok: true, value: HELP_TEXT } as const;
  }

  const input = argv[0];
  if (!input || input.startsWith("-")) {
    return { ok: false, error: HELP_TEXT } as const;
  }

  const oIndex = argv.indexOf("-o");
  if (oIndex === -1) {
    return { ok: false, error: "Missing -o flag. Usage: sizuku <input> -o <output>" } as const;
  }

  const output = argv[oIndex + 1];
  if (!output) {
    return { ok: false, error: "Missing output file path after -o" } as const;
  }

  const outputType = detectOutputType(output);
  if (!outputType) {
    return {
      ok: false,
      error: `Unsupported output format: ${output}. Supported: .dbml, .png, .md, .ts`,
    } as const;
  }

  if (outputType === "typescript") {
    return sizukuDirectSchema(input, output, parseFlags(argv));
  }

  return sizukuDirectDiagram(input, output, outputType);
}
