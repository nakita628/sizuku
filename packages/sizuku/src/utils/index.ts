export type ValidationTag = "@z." | "@v." | "@a." | "@e.";

export function makeCapitalized(str: string) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

export function resolveWrapperType(objectType: "strict" | "loose" | undefined) {
  if (objectType === "strict") return "strictObject" as const;
  if (objectType === "loose") return "looseObject" as const;
  return "object" as const;
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
  switch (wrapperType) {
    case "strictObject":
      return `z.strictObject({${inner}})`;
    case "looseObject":
      return `z.looseObject({${inner}})`;
    default:
      return `z.object({${inner}})`;
  }
}

export function makeValibotObject(
  inner: string,
  wrapperType: "object" | "strictObject" | "looseObject" = "object",
) {
  switch (wrapperType) {
    case "strictObject":
      return `v.strictObject({${inner}})`;
    case "looseObject":
      return `v.looseObject({${inner}})`;
    default:
      return `v.object({${inner}})`;
  }
}

export function removeTripleSlash(str: string) {
  return str.startsWith("///") ? str.substring(3) : str;
}

export function isNonEmpty(str: string) {
  return str.length > 0;
}

export function containsSubstring(str: string, substr: string) {
  return str.indexOf(substr) !== -1;
}

export function startsWith(str: string, prefix: string) {
  return str.indexOf(prefix) === 0;
}

export function removeAtSign(str: string) {
  return str.startsWith("@") ? str.substring(1) : str;
}

export function joinWithSpace(arr: readonly string[]) {
  return arr.join(" ");
}

export function splitByNewline(str: string) {
  return str.split("\n");
}

export function trimString(str: string) {
  return str.trim();
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

export function splitByDot(str: string) {
  return str.split(".");
}

export function cleanCommentLines(commentLines: readonly string[]) {
  return commentLines.map((line) => line.replace(/^\/\/\/\s*/, "").trim()).filter(Boolean);
}

function extractObjectType(cleaned: readonly string[], tag: ValidationTag) {
  const tagWithoutAt = tag.slice(1);
  const objectTypeLine = cleaned.find(
    (line) =>
      line.includes(`${tagWithoutAt}strictObject`) || line.includes(`${tagWithoutAt}looseObject`),
  );
  if (!objectTypeLine) return undefined;
  if (objectTypeLine.includes("strictObject")) return "strict" as const;
  if (objectTypeLine.includes("looseObject")) return "loose" as const;
  return undefined;
}

// For arktype/effect, drop the library prefix from the raw definition
// For zod/valibot, keep the library prefix
function extractDefinition(cleaned: readonly string[], tag: ValidationTag) {
  const definitionLine = cleaned.find(
    (line) =>
      line.startsWith(tag) && !line.includes("strictObject") && !line.includes("looseObject"),
  );
  if (!definitionLine) return "";
  const withoutAt = definitionLine.startsWith("@") ? definitionLine.substring(1) : definitionLine;
  if (tag === "@a." || tag === "@e.") {
    const prefix = tag.substring(1);
    return withoutAt.startsWith(prefix) ? withoutAt.substring(prefix.length) : withoutAt;
  }
  return withoutAt;
}

function extractDescription(cleaned: readonly string[]) {
  const descriptionLines = cleaned.filter(
    (line) =>
      !(
        line.includes("@z.") ||
        line.includes("@v.") ||
        line.includes("@a.") ||
        line.includes("@e.") ||
        line.includes("@relation.")
      ),
  );
  return descriptionLines.length > 0 ? descriptionLines.join(" ") : undefined;
}

export function parseFieldComments(commentLines: readonly string[], tag: ValidationTag) {
  const cleaned = cleanCommentLines(commentLines);
  return {
    definition: extractDefinition(cleaned, tag),
    description: extractDescription(cleaned),
    objectType: extractObjectType(cleaned, tag),
  };
}

function processCommentLine(
  acc: { readonly commentLines: readonly string[]; readonly shouldStop: boolean },
  line: string,
) {
  if (acc.shouldStop) return acc;
  if (line.startsWith("///")) {
    return { commentLines: [line, ...acc.commentLines], shouldStop: false };
  }
  if (line === "") return acc;
  return { commentLines: acc.commentLines, shouldStop: true };
}

export function extractFieldComments(sourceText: string, fieldStartPos: number) {
  const beforeField = sourceText.substring(0, fieldStartPos);
  const lines = beforeField.split("\n");
  return lines
    .map((line) => line.trim())
    .reverse()
    .reduce<{ readonly commentLines: readonly string[]; readonly shouldStop: boolean }>(
      processCommentLine,
      { commentLines: [], shouldStop: false },
    ).commentLines;
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
