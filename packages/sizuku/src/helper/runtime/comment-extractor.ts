import type { ColumnCommentMap, CommentAnnotation, CommentInfo, TableCommentMap } from "./types.js";

const ANNOTATION_PATTERNS = {
  zod: /@z\.([^\n@]+)/g,
  valibot: /@v\.([^\n@]+)/g,
  arktype: /@a\.([^\n@]+)/g,
  effect: /@e\.([^\n@]+)/g,
  description: /@description\s+["']([^"']+)["']/g,
  relation: /@relation\s+([^\n]+)/g,
  custom: /@(\w+)\.(\w+)\s+([^\n@]+)/g,
};

function parseAnnotation(type: CommentAnnotation["type"], key: string, value: string) {
  return {
    type,
    key: key.trim(),
    value: value.trim(),
  };
}

function extractAnnotationsFromComment(comment: string) {
  const matches = (
    [
      ["zod", "schema"],
      ["valibot", "schema"],
      ["arktype", "schema"],
      ["effect", "schema"],
      ["description", "description"],
      ["relation", "relation"],
    ] as const
  ).flatMap(([type, key]) =>
    [...comment.matchAll(new RegExp(ANNOTATION_PATTERNS[type].source, "g"))].map((m) =>
      parseAnnotation(type, key, m[1]),
    ),
  );

  const knownNamespaces = new Set(["z", "v", "a", "e", "description", "relation"]);
  const customMatches = [
    ...comment.matchAll(new RegExp(ANNOTATION_PATTERNS.custom.source, "g")),
  ].flatMap((m) => {
    const [, namespace, key, value] = m;
    if (knownNamespaces.has(namespace)) return [];
    return [parseAnnotation("custom", `${namespace}.${key}`, value)];
  });

  return [...matches, ...customMatches];
}

function extractTableContent(source: string, startIndex: number) {
  const firstOpen = source.indexOf("{", startIndex);
  if (firstOpen === -1) return null;
  const start = firstOpen + 1;

  const closeIndex = (() => {
    let depth = 1;
    for (let j = start; j < source.length; j++) {
      if (source[j] === "{") depth++;
      else if (source[j] === "}") {
        depth--;
        if (depth === 0) return j;
      }
    }
    return -1;
  })();

  return closeIndex === -1 ? null : source.substring(start, closeIndex);
}

function extractColumnAnnotations(tableContent: string, tableName: string) {
  const columnPattern =
    /(?:\/\*\*?([\s\S]*?)\*\/|\/\/\/([^\n]*(?:\n\s*\/\/\/[^\n]*)*))\s*(\w+)\s*:/g;

  return [...tableContent.matchAll(columnPattern)].reduce<ColumnCommentMap>((acc, match) => {
    const blockComment = match[1] || "";
    const lineComment = match[2] || "";
    const columnName = match[3];
    const comment = blockComment || lineComment.replace(/\n\s*\/\/\//g, "\n");
    const annotations = extractAnnotationsFromComment(comment);
    if (annotations.length > 0) acc.set(`${tableName}.${columnName}`, annotations);
    return acc;
  }, new Map());
}

export function extractCommentsFromSource(sourceCode: string) {
  const tablePattern =
    /(?:\/\*\*?([\s\S]*?)\*\/|\/\/\/([^\n]*(?:\n\/\/\/[^\n]*)*))\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:\w+\.table|pgTable|mysqlTable|sqliteTable)\s*\(\s*["'](\w+)["']/g;

  const tableComments: TableCommentMap = new Map();
  const columnComments: ColumnCommentMap = new Map();

  for (const tableMatch of sourceCode.matchAll(tablePattern)) {
    const blockComment = tableMatch[1] || "";
    const lineComment = tableMatch[2] || "";
    const tableName = tableMatch[4];
    const comment = blockComment || lineComment.replace(/\n\/\/\//g, "\n");

    const annotations = extractAnnotationsFromComment(comment);
    if (annotations.length > 0) tableComments.set(tableName, annotations);

    const tableStart = (tableMatch.index ?? 0) + tableMatch[0].length;
    const tableContent = extractTableContent(sourceCode, tableStart);

    if (tableContent) {
      for (const [key, value] of extractColumnAnnotations(tableContent, tableName)) {
        columnComments.set(key, value);
      }
    }
  }

  return { tableComments, columnComments };
}

export function parseAnnotations(comment: string) {
  return extractAnnotationsFromComment(comment);
}

export function createEmptyCommentInfo(): CommentInfo {
  return {
    tableComments: new Map(),
    columnComments: new Map(),
  };
}
