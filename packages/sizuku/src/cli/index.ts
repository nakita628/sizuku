import {
  sizukuArktype,
  sizukuDbml,
  sizukuEffect,
  sizukuER,
  sizukuMermaidER,
  sizukuValibot,
  sizukuZod,
} from "../core/index.js";
import { readFileSync } from "../fsp/index.js";
import { startStudio } from "../studio/index.js";
import { stripImports } from "../utils/index.js";

const HELP_TEXT = `💧 sizuku - Drizzle ORM schema tools

Usage:
  sizuku <input> -o <output> [options]
  sizuku studio <input> [--port <port>]   Edit the schema with a live ER diagram

Options:
  -o <path>                         Output file path (.ts, .md, .dbml, .svg, .png)
  --zod                             Generate Zod validation schema
  --valibot                         Generate Valibot validation schema
  --arktype                         Generate ArkType validation schema
  --effect                          Generate Effect Schema validation schema
  --zod-version <version>           Zod variant: 'v4' | 'mini' | '@hono/zod-openapi'
  --no-export-types                 Do not export inferred types
  --no-with-comment                 Do not add JSDoc comments
  --no-with-relation                Do not generate relation schemas
  --theme <light|dark>              Colour scheme of the .svg / .png ER diagram
  --port <port>                     Port for sizuku studio (default: 4983)
  -h, --help                        Display this help message`;

// The value of `--name value` or `--name=value`.
function flagValue(args: readonly string[], name: string) {
  const index = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (index === -1) return undefined;
  return args[index].includes("=") ? args[index].split("=")[1] : args[index + 1];
}

function parseFlags(args: readonly string[]) {
  const ZOD_VERSIONS = ["v4", "mini", "@hono/zod-openapi"] as const;
  const zodVersionValue = flagValue(args, "--zod-version");

  return {
    zod: args.includes("--zod"),
    valibot: args.includes("--valibot"),
    arktype: args.includes("--arktype"),
    effect: args.includes("--effect"),
    zodVersion: ZOD_VERSIONS.find((v) => v === zodVersionValue),
    exportTypes: !args.includes("--no-export-types"),
    withComment: !args.includes("--no-with-comment"),
    withRelation: !args.includes("--no-with-relation"),
  };
}

export async function sizuku() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { ok: true, value: HELP_TEXT } as const;
  }
  if (args[0] === "studio") {
    const file = args[1];
    if (!file || file.startsWith("-")) {
      return { ok: false, error: "Usage: sizuku studio <input> [--port <port>]" } as const;
    }
    const port = Number(flagValue(args, "--port") ?? 4983);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      return {
        ok: false,
        error: `--port takes a port number, not "${flagValue(args, "--port")}"`,
      } as const;
    }
    return startStudio(file, port);
  }
  const input = args[0];
  if (!input || input.startsWith("-")) {
    return { ok: false, error: HELP_TEXT } as const;
  }
  const oIndex = args.indexOf("-o");
  if (oIndex === -1) {
    return { ok: false, error: "Missing -o flag. Usage: sizuku <input> -o <output>" } as const;
  }
  const output = args[oIndex + 1];
  if (!output) {
    return { ok: false, error: "Missing output file path after -o" } as const;
  }
  const outputType = output.endsWith(".dbml")
    ? ("dbml" as const)
    : output.endsWith(".png") || output.endsWith(".svg")
      ? ("diagram" as const)
      : output.endsWith(".md")
        ? ("mermaid" as const)
        : output.endsWith(".ts")
          ? ("typescript" as const)
          : null;
  if (!outputType) {
    return {
      ok: false,
      error: `Unsupported output format: ${output}. Supported: .dbml, .svg, .png, .md, .ts`,
    } as const;
  }
  const flags = outputType === "typescript" ? parseFlags(args) : null;
  const lib =
    flags === null
      ? null
      : flags.zod
        ? ({ name: "zod", label: "Zod" } as const)
        : flags.valibot
          ? ({ name: "valibot", label: "Valibot" } as const)
          : flags.arktype
            ? ({ name: "arktype", label: "ArkType" } as const)
            : flags.effect
              ? ({ name: "effect", label: "Effect" } as const)
              : null;
  if (outputType === "typescript" && !lib) {
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
  if (outputType === "dbml") {
    const result = await sizukuDbml(code, output);
    if (!result.ok) return result;
    return { ok: true, value: `💧 Generated DBML at: ${output}` } as const;
  }
  if (outputType === "diagram") {
    const theme = flagValue(args, "--theme");
    if (theme !== undefined && theme !== "light" && theme !== "dark") {
      return { ok: false, error: `--theme takes light or dark, not "${theme}"` } as const;
    }
    const result = await sizukuER(code, output, theme);
    if (!result.ok) return result;
    const label = output.endsWith(".png") ? "PNG" : "SVG";
    return { ok: true, value: `💧 Generated ${label} ER diagram at: ${output}` } as const;
  }
  if (outputType === "mermaid") {
    const result = await sizukuMermaidER(code, output);
    if (!result.ok) return result;
    return { ok: true, value: `💧 Generated Mermaid ER at: ${output}` } as const;
  }
  if (!lib || !flags) {
    return { ok: false, error: "internal: missing lib/flags" } as const;
  }
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
