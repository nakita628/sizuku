export function makeCapitalized(str: string) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

export function resolveWrapperType(
  objectType: "strict" | "loose" | undefined,
): "strictObject" | "looseObject" | "object" {
  if (objectType === "strict") return "strictObject";
  if (objectType === "loose") return "looseObject";
  return "object";
}

// ArkType uses `"+"` to control unknown property behavior:
// strict → reject unknown keys, loose → preserve them (default), undefined → omit
export function resolveArktypeUndeclared(objectType: "strict" | "loose" | undefined) {
  if (objectType === "strict") return '"+":"reject",';
  if (objectType === "loose") return '"+":"ignore",';
  return "";
}

export function makeRelationFields(
  fields: readonly { readonly name: string; readonly definition: string }[],
) {
  return fields.map((f) => `${f.name}:${f.definition}`).join(",");
}

export function makeZodObject(
  inner: string,
  wrapperType: "object" | "strictObject" | "looseObject" = "object",
) {
  return `z.${wrapperType}({${inner}})`;
}

export function makeValibotObject(
  inner: string,
  wrapperType: "object" | "strictObject" | "looseObject" = "object",
) {
  return `v.${wrapperType}({${inner}})`;
}

// "@relation <from.field> <to.field> <type>" → 4 parts minimum
export function parseRelationLine(line: string) {
  if (!line.startsWith("@relation")) return null;

  const parts = line.trim().split(/\s+/);
  if (parts.length < 4) return null;

  const fromParts = parts[1].split(".");
  const toParts = parts[2].split(".");
  if (fromParts.length !== 2 || toParts.length !== 2) return null;

  return {
    fromModel: fromParts[0],
    fromField: fromParts[1],
    toModel: toParts[0],
    toField: toParts[1],
    type: parts[3],
  };
}

export function splitByTo(str: string) {
  const index = str.indexOf("-to-");
  if (index === -1) return null;
  return [str.substring(0, index), str.substring(index + 4)] as const;
}

export function removeOptionalSuffix(str: string) {
  const index = str.indexOf("-optional");
  return index !== -1 ? str.substring(0, index) : str;
}

export function splitByWhitespace(str: string) {
  return str
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0);
}

function cleanCommentLines(commentLines: readonly string[]) {
  return commentLines.map((line) => line.replace(/^\/\/\/\s*/, "").trim()).filter(Boolean);
}

export function parseFieldComments(
  commentLines: readonly string[],
  tag: "@z." | "@v." | "@a." | "@e.",
) {
  const cleaned = cleanCommentLines(commentLines);
  const tagWithoutAt = tag.slice(1);

  const objectTypeLine = cleaned.find(
    (line) =>
      line.includes(`${tagWithoutAt}strictObject`) || line.includes(`${tagWithoutAt}looseObject`),
  );
  const objectType: "strict" | "loose" | undefined = !objectTypeLine
    ? undefined
    : objectTypeLine.includes("strictObject")
      ? "strict"
      : "loose";

  const definitionLine = cleaned.find(
    (line) =>
      line.startsWith(tag) && !line.includes("strictObject") && !line.includes("looseObject"),
  );
  const definition = (() => {
    if (!definitionLine) return "";
    const withoutAt = definitionLine.startsWith("@") ? definitionLine.substring(1) : definitionLine;
    // For arktype/effect, drop the library prefix from the raw definition
    if (tag === "@a." || tag === "@e.") {
      const prefix = tag.substring(1);
      return withoutAt.startsWith(prefix) ? withoutAt.substring(prefix.length) : withoutAt;
    }
    return withoutAt;
  })();

  const descriptionLines = cleaned.filter(
    (line) =>
      !line.includes("@z.") &&
      !line.includes("@v.") &&
      !line.includes("@a.") &&
      !line.includes("@e.") &&
      !line.includes("@relation."),
  );
  const description = descriptionLines.length > 0 ? descriptionLines.join(" ") : undefined;

  return { definition, description, objectType };
}

export function extractFieldComments(sourceText: string, fieldStartPos: number) {
  const reversed = sourceText
    .substring(0, fieldStartPos)
    .split("\n")
    .map((l) => l.trim())
    .reverse();
  // Stop at the first non-empty line that isn't a `///` comment.
  const stopIdx = reversed.findIndex((l) => l !== "" && !l.startsWith("///"));
  const candidates = stopIdx === -1 ? reversed : reversed.slice(0, stopIdx);
  return candidates.filter((l) => l.startsWith("///")).reverse();
}

export function infer(name: string) {
  const modelName = makeCapitalized(name);
  return `export type ${modelName} = z.infer<typeof ${modelName}Schema>`;
}

export function inferOutput(name: string) {
  const modelName = makeCapitalized(name);
  return `export type ${modelName} = v.InferOutput<typeof ${modelName}Schema>`;
}

export function makeCommentBlock(description: string) {
  if (!description) return "";
  return `/**\n * ${description}\n */\n`;
}

export function fieldDefinitions(
  schema: {
    readonly name: string;
    readonly fields: {
      readonly name: string;
      readonly definition: string;
      readonly description?: string;
    }[];
  },
  comment: boolean,
) {
  return schema.fields
    .map(({ name, definition, description }) => {
      const commentCode = description && comment ? makeCommentBlock(description) : "";
      return `${commentCode}${name}:${definition}`;
    })
    .join(",\n");
}

export function inferArktype(name: string) {
  const capitalized = makeCapitalized(name);
  return `export type ${capitalized} = typeof ${capitalized}Schema.infer`;
}

export function inferEffect(name: string) {
  const capitalized = makeCapitalized(name);
  return `export type ${capitalized}Encoded = typeof ${capitalized}Schema.Encoded`;
}
