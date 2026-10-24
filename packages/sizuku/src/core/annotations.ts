import { Effect } from "effect";
import { unannotatedColumns } from "../helper/index.js";
import { MissingAnnotationError } from "./errors.js";

const LIBRARIES = {
  zod: { label: "Zod", tag: "@z.", example: "/// @z.string()" },
  valibot: { label: "Valibot", tag: "@v.", example: "/// @v.string()" },
  arktype: { label: "ArkType", tag: "@a.", example: '/// @a."string"' },
  effect: { label: "Effect", tag: "@e.", example: "/// @e.Schema.String" },
} as const;

/**
 * Succeeds when every column of the schema is annotated for the library, and otherwise fails
 * naming each one that is not, so no schema with an empty field is written.
 */
export function requireAnnotations(
  code: string[],
  library: "zod" | "valibot" | "arktype" | "effect",
) {
  return Effect.gen(function* () {
    const columns = unannotatedColumns(code, library);
    if (columns.length === 0) return;
    const { label, tag, example } = LIBRARIES[library];
    const count = columns.length === 1 ? "1 column has" : `${columns.length} columns have`;
    return yield* new MissingAnnotationError({
      columns,
      message: `${count} no /// ${tag} annotation, so the ${label} schema cannot be written: ${columns.join(", ")}.\n   Add one above each column, for example ${example}.`,
    });
  });
}
