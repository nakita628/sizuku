export function makeCapitalized(str: string) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

export function stripImports(content: string) {
  const lines = content.split("\n");
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith("import") && line.trim() !== "",
  );
  return lines.slice(codeStart);
}

export function resolveWrapperType(
  objectType: "strict" | "loose" | undefined,
): "strictObject" | "looseObject" | "object" {
  if (objectType === "strict") return "strictObject";
  if (objectType === "loose") return "looseObject";
  return "object";
}

export function makeRelationFields(
  fields: readonly { readonly name: string; readonly definition: string }[],
) {
  return fields.map((f) => `${f.name}:${f.definition}`).join(",");
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
      const commentCode = description && comment ? `/**\n * ${description}\n */\n` : "";
      return `${commentCode}${name}:${definition}`;
    })
    .join(",\n");
}
