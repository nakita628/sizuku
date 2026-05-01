function parseAnnotation(
  type: "zod" | "valibot" | "arktype" | "effect" | "description" | "relation" | "custom",
  key: string,
  value: string,
) {
  return {
    type,
    key: key.trim(),
    value: value.trim(),
  };
}

function extractAnnotationsFromComment(comment: string) {
  const matches = (
    [
      ["zod", "schema", /@z\.([^\n@]+)/g],
      ["valibot", "schema", /@v\.([^\n@]+)/g],
      ["arktype", "schema", /@a\.([^\n@]+)/g],
      ["effect", "schema", /@e\.([^\n@]+)/g],
      ["description", "description", /@description\s+["']([^"']+)["']/g],
      ["relation", "relation", /@relation\s+([^\n]+)/g],
    ] as const
  ).flatMap(([type, key, regex]) =>
    [...comment.matchAll(regex)].map((m) => parseAnnotation(type, key, m[1])),
  );

  const customMatches = [...comment.matchAll(/@(\w+)\.(\w+)\s+([^\n@]+)/g)].flatMap((m) => {
    const [, namespace, key, value] = m;
    if (["z", "v", "a", "e", "description", "relation"].includes(namespace)) return [];
    return [parseAnnotation("custom", `${namespace}.${key}`, value)];
  });

  return [...matches, ...customMatches];
}

function extractTableContent(source: string, startIndex: number) {
  const firstOpen = source.indexOf("{", startIndex);
  if (firstOpen === -1) return null;
  const start = firstOpen + 1;

  // Walk forward computing running brace depth; stop at the first index where depth hits 0.
  const closeIndex = source
    .substring(start)
    .split("")
    .reduce<{ readonly depth: number; readonly closeAt: number | null }>(
      (state, ch, i) => {
        if (state.closeAt !== null) return state;
        if (ch === "{") return { depth: state.depth + 1, closeAt: null };
        if (ch === "}") {
          const nextDepth = state.depth - 1;
          return nextDepth === 0
            ? { depth: nextDepth, closeAt: start + i }
            : { depth: nextDepth, closeAt: null };
        }
        return state;
      },
      { depth: 1, closeAt: null },
    ).closeAt;

  return closeIndex === null ? null : source.substring(start, closeIndex);
}

function extractColumnAnnotations(tableContent: string, tableName: string) {
  const columnPattern =
    /(?:\/\*\*?([\s\S]*?)\*\/|\/\/\/([^\n]*(?:\n\s*\/\/\/[^\n]*)*))\s*(\w+)\s*:/g;
  return [...tableContent.matchAll(columnPattern)].flatMap((match) => {
    const blockComment = match[1] || "";
    const lineComment = match[2] || "";
    const columnName = match[3];
    const comment = blockComment || lineComment.replace(/\n\s*\/\/\//g, "\n");
    const annotations = extractAnnotationsFromComment(comment);
    return annotations.length > 0 ? [[`${tableName}.${columnName}`, annotations] as const] : [];
  });
}

export function extractCommentsFromSource(sourceCode: string) {
  const tablePattern =
    /(?:\/\*\*?([\s\S]*?)\*\/|\/\/\/([^\n]*(?:\n\/\/\/[^\n]*)*))\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:\w+\.table|pgTable|mysqlTable|sqliteTable)\s*\(\s*["'](\w+)["']/g;
  const matches = [...sourceCode.matchAll(tablePattern)];

  const tableEntries = matches.flatMap((m) => {
    const tableName = m[4];
    const comment = m[1] || (m[2] || "").replace(/\n\/\/\//g, "\n");
    const annotations = extractAnnotationsFromComment(comment);
    return annotations.length > 0 ? [[tableName, annotations] as const] : [];
  });

  const columnEntries = matches.flatMap((m) => {
    const tableContent = extractTableContent(sourceCode, (m.index ?? 0) + m[0].length);
    return tableContent ? extractColumnAnnotations(tableContent, m[4]) : [];
  });

  return {
    tableComments: new Map(tableEntries),
    columnComments: new Map(columnEntries),
  };
}

export function parseAnnotations(comment: string) {
  return extractAnnotationsFromComment(comment);
}

export function createEmptyCommentInfo() {
  return {
    tableComments: new Map<
      string,
      {
        type: "zod" | "valibot" | "arktype" | "effect" | "description" | "relation" | "custom";
        key: string;
        value: string;
      }[]
    >(),
    columnComments: new Map<
      string,
      {
        type: "zod" | "valibot" | "arktype" | "effect" | "description" | "relation" | "custom";
        key: string;
        value: string;
      }[]
    >(),
  };
}
