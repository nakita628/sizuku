import { Config, Console, Effect, Option } from "effect";
import { Argument, CliError, Command, Flag } from "effect/cli";
import { version } from "../../package.json" with { type: "json" };
import {
  sizukuArktype,
  sizukuDbml,
  sizukuEffect,
  sizukuER,
  sizukuMermaidER,
  sizukuValibot,
  sizukuZod,
} from "../core/index.js";
import { exists, readFile } from "../file/index.js";
import { DEFAULT_PORT } from "../studio/server/constants/index.js";
import { stripImports } from "../utils/index.js";

const COMMAND_NAME = "sizuku";

/** What an output path asks for, by its extension; null for one sizuku does not write. */
export function outputKind(output: string) {
  if (output.endsWith(".dbml")) return "dbml" as const;
  if (output.endsWith(".png") || output.endsWith(".svg")) return "diagram" as const;
  if (output.endsWith(".md")) return "mermaid" as const;
  if (output.endsWith(".ts")) return "typescript" as const;
  return null;
}

const LIBRARIES = [
  { flag: "zod", label: "Zod" },
  { flag: "valibot", label: "Valibot" },
  { flag: "arktype", label: "ArkType" },
  { flag: "effect", label: "Effect" },
] as const;

const generateFlags = {
  input: Argument.String("input").pipe(
    Argument.withDescription("The Drizzle schema file to read"),
    Argument.optional,
  ),
  output: Flag.String("output").pipe(
    Flag.withAlias("o"),
    Flag.withDescription("Output file path (.ts, .md, .dbml, .svg, .png)"),
    Flag.withMetavar("path"),
    Flag.optional,
  ),
  zod: Flag.Boolean("zod").pipe(
    Flag.withDescription("Generate Zod validation schema"),
    Flag.withDefault(false),
  ),
  valibot: Flag.Boolean("valibot").pipe(
    Flag.withDescription("Generate Valibot validation schema"),
    Flag.withDefault(false),
  ),
  arktype: Flag.Boolean("arktype").pipe(
    Flag.withDescription("Generate ArkType validation schema"),
    Flag.withDefault(false),
  ),
  effect: Flag.Boolean("effect").pipe(
    Flag.withDescription("Generate Effect Schema validation schema"),
    Flag.withDefault(false),
  ),
  zodVersion: Flag.Literals("zod-version", ["v4", "mini", "@hono/zod-openapi"]).pipe(
    Flag.withDescription("Zod variant"),
    Flag.withDefault("v4"),
  ),
  exportTypes: Flag.Boolean("export-types").pipe(
    Flag.withDescription("Export inferred types (--no-export-types to leave them out)"),
    Flag.withDefault(true),
  ),
  withComment: Flag.Boolean("with-comment").pipe(
    Flag.withDescription("Add JSDoc comments (--no-with-comment to leave them out)"),
    Flag.withDefault(true),
  ),
  withRelation: Flag.Boolean("with-relation").pipe(
    Flag.withDescription("Generate relation schemas (--no-with-relation to leave them out)"),
    Flag.withDefault(true),
  ),
  theme: Flag.Literals("theme", ["light", "dark"]).pipe(
    Flag.withDescription("Colour scheme of the .svg / .png ER diagram"),
    Flag.withDefault("light"),
  ),
};

type GenerateArgs = Command.Command.Config.Infer<typeof generateFlags>;

function userError(cause: string) {
  return new CliError.UserError({ cause });
}

/** The schema's text with its imports taken out, or a UserError naming the file. */
function readSchema(input: string) {
  return Effect.gen(function* () {
    if (!(yield* exists(input)))
      return yield* userError(`Failed to read input: ${input} does not exist`);
    const text = yield* readFile(input).pipe(
      Effect.mapError((error) => userError(`Failed to read input: ${error.message}`)),
    );
    return stripImports(text);
  });
}

/** Reads the schema and writes what the output path asks for; the line it prints names it. */
export function generate(args: GenerateArgs) {
  return Effect.gen(function* () {
    // Without a schema there is nothing to do: the usage is the answer.
    if (Option.isNone(args.input)) {
      return yield* new CliError.ShowHelp({ commandPath: [COMMAND_NAME], errors: [] });
    }
    const input = args.input.value;
    if (Option.isNone(args.output)) {
      return yield* userError("Missing -o flag. Usage: sizuku <input> -o <output>");
    }
    const output = args.output.value;
    const kind = outputKind(output);
    if (kind === null) {
      return yield* userError(
        `Unsupported output format: ${output}. Supported: .dbml, .svg, .png, .md, .ts`,
      );
    }
    const library = LIBRARIES.find((entry) => args[entry.flag]) ?? null;
    if (kind === "typescript" && library === null) {
      return yield* userError("Specify --zod, --valibot, --arktype, or --effect for .ts output");
    }
    const code = yield* readSchema(input);
    const written = (() => {
      if (kind === "dbml") return sizukuDbml(code, output);
      if (kind === "diagram") return sizukuER(code, output, args.theme);
      if (kind === "mermaid") return sizukuMermaidER(code, output);
      const { withComment, exportTypes, withRelation } = args;
      if (library?.flag === "zod") {
        return sizukuZod(code, output, withComment, exportTypes, args.zodVersion, withRelation);
      }
      if (library?.flag === "valibot") {
        return sizukuValibot(code, output, withComment, exportTypes, withRelation);
      }
      if (library?.flag === "arktype") {
        return sizukuArktype(code, output, withComment, exportTypes, withRelation);
      }
      return sizukuEffect(code, output, withComment, exportTypes, withRelation);
    })();
    yield* written.pipe(
      Effect.mapError((error) => userError(`Failed to write ${output}: ${error.message}`)),
    );
    const what =
      kind === "dbml"
        ? "DBML"
        : kind === "mermaid"
          ? "Mermaid ER"
          : kind === "diagram"
            ? `${output.endsWith(".png") ? "PNG" : "SVG"} ER diagram`
            : `${library?.label ?? ""} schema`;
    yield* Console.log(`💧 Generated ${what} at: ${output}`);
  });
}

const studioFlags = {
  input: Argument.String("input").pipe(Argument.withDescription("The Drizzle schema file to edit")),
  port: Flag.Int("port").pipe(
    Flag.withAlias("p"),
    Flag.withDescription(`Port to listen on (default: ${DEFAULT_PORT})`),
    Flag.withMetavar("port"),
    Flag.filter(
      (port) => port >= 1 && port <= 65_535,
      () => "a port from 1 to 65535",
    ),
    Flag.withDefault(DEFAULT_PORT),
  ),
  url: Flag.String("url").pipe(
    Flag.withAlias("u"),
    Flag.withDescription("Database to browse, edit and query (default: $DATABASE_URL)"),
    Flag.withMetavar("database-url"),
    Flag.withFallbackConfig(Config.String("DATABASE_URL")),
    Flag.optional,
  ),
};

// The server pulls in Hono, the drivers and the language service, which `--help`, `--version`
// and a rejected command line must not pay for, so it is imported when it runs.
function studio() {
  return Command.make("studio", studioFlags, (args) =>
    Effect.gen(function* () {
      const { runStudio } = yield* Effect.promise(() => import("../studio/index.js"));
      return yield* runStudio({
        file: args.input,
        port: args.port,
        url: Option.getOrNull(args.url),
      }).pipe(
        Effect.mapError((error) =>
          userError(
            error._tag === "ServerListenError"
              ? error.code === "EADDRINUSE"
                ? `Port ${error.port} is in use. Pass --port to pick another.`
                : `Failed to start studio: ${error.message}`
              : `Failed to read input: ${error.path} ${error.cause}`,
          ),
        ),
      );
    }),
  ).pipe(Command.withDescription("Edit the schema, its ER diagram, docs and data"));
}

function cli() {
  return Command.make(COMMAND_NAME, generateFlags, generate).pipe(
    Command.withDescription("💧 Drizzle ORM schema tools"),
    Command.withSubcommands([studio()]),
  );
}

/** The `sizuku` command line, run with the arguments the `Stdio` service supplies. */
export function sizuku() {
  return Command.run(cli(), { version });
}
