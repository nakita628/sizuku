import type {
  ArrowFunctionExpression,
  CallExpression,
  Expression,
  Node,
  ObjectExpression,
  ObjectProperty,
  VariableDeclarator,
} from "oxc-parser";
import { parseSync } from "oxc-parser";

// The Drizzle schema parsed once with oxc. `text` is the source the offsets
// point into: oxc hands JS UTF-16 offsets, so `text.slice(start, end)` is the
// node's own text, as ts-morph's `getText()` was.
export function parseSource(code: readonly string[]) {
  const text = code.join("\n");
  const { program } = parseSync("temp.ts", text, { lang: "ts", sourceType: "module" });
  return { program, text };
}

export function textOf(text: string, node: { readonly start: number; readonly end: number }) {
  return text.slice(node.start, node.end);
}

// The first declarator of every `export const ...` at the top level, with the
// offset of the statement (the `export` keyword) its leading comments sit above.
export function exportedDeclarations(program: ReturnType<typeof parseSource>["program"]) {
  return program.body.flatMap((stmt) => {
    if (stmt.type !== "ExportNamedDeclaration") return [];
    const decl = stmt.declaration;
    if (decl?.type !== "VariableDeclaration") return [];
    return decl.declarations.map((declarator) => ({ declarator, start: stmt.start }));
  });
}

export function declaratorName(declarator: VariableDeclarator) {
  return declarator.id.type === "Identifier" ? declarator.id.name : null;
}

export function isCall(node: Node | null | undefined): node is CallExpression {
  return node?.type === "CallExpression";
}

export function isArrow(node: Node | null | undefined): node is ArrowFunctionExpression {
  return node?.type === "ArrowFunctionExpression";
}

export function isObject(node: Node | null | undefined): node is ObjectExpression {
  return node?.type === "ObjectExpression";
}

// `key: value` — not a shorthand `key`, a method `key() {}`, an accessor or a spread.
export function isPropertyAssignment(node: Node): node is ObjectProperty {
  return node.type === "Property" && node.kind === "init" && !node.shorthand && !node.method;
}

export function unwrapParens(node: Expression): Expression {
  return node.type === "ParenthesizedExpression" ? unwrapParens(node.expression) : node;
}

// The object an arrow returns: `() => ({ ... })`, `() => { return { ... } }`.
export function arrowObject(arrow: ArrowFunctionExpression) {
  if (arrow.body.type !== "BlockStatement") {
    const expr = unwrapParens(arrow.body);
    return isObject(expr) ? expr : null;
  }
  const ret = arrow.body.body.find((stmt) => stmt.type === "ReturnStatement");
  return ret?.argument && isObject(ret.argument) ? ret.argument : null;
}

// Every call expression in a subtree, the node itself included, outermost first.
export function callsIn(node: Node): CallExpression[] {
  // `parent` points back up the tree; following it would never end.
  const children = Object.entries(node).flatMap(([key, value]): Node[] => {
    if (key === "parent") return [];
    if (Array.isArray(value)) return value.filter(isNode);
    return isNode(value) ? [value] : [];
  });
  return [...(isCall(node) ? [node] : []), ...children.flatMap(callsIn)];
}

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && "type" in value && "start" in value;
}
