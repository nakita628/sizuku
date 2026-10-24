import type { CallExpression, Expression, ObjectProperty, Program } from "oxc-parser";
import {
  arrowObject,
  descriptionBefore,
  callsIn,
  declaratorName,
  exportedDeclarations,
  isArrow,
  isCall,
  isObject,
  isPropertyAssignment,
  parseSource,
  textOf,
  unwrapParens,
} from "./ast.js";

function baseBuilderName(expr: Expression, text: string): string {
  if (expr.type === "Identifier") return textOf(text, expr);
  if (expr.type === "CallExpression") return baseBuilderName(expr.callee, text);
  if (expr.type === "MemberExpression" && !expr.computed) return baseBuilderName(expr.object, text);
  return "";
}

function extractKeyType(initText: string) {
  if (initText.includes(".primaryKey()")) return "PK" as const;
  if (initText.includes(".references(")) return "FK" as const;
  return null;
}

// The name of a `key: value` property when the key is a plain identifier.
function identifierKey(prop: ObjectProperty) {
  return !prop.computed && prop.key.type === "Identifier" ? prop.key.name : null;
}

// Reads the `() => table.col` target from a `.references()` call via the AST so
// the second argument (a `{ onDelete, onUpdate }` config object) never affects
// extraction — a text-based match on `.references(... )` would lose the relation
// whenever a referential-action config is present.
function extractReferenceInfo(initExpr: CallExpression) {
  const referencesCall = callsIn(initExpr).find(
    (call) =>
      call.callee.type === "MemberExpression" &&
      !call.callee.computed &&
      call.callee.property.type === "Identifier" &&
      call.callee.property.name === "references",
  );
  if (!referencesCall) return null;
  const [target] = referencesCall.arguments;
  if (!isArrow(target)) return null;
  const body = target.body;
  if (body.type !== "MemberExpression" || body.computed) return null;
  if (body.object.type !== "Identifier" || body.property.type !== "Identifier") return null;
  return {
    referencedTable: body.object.name,
    referencedField: body.property.name,
  };
}

function isFieldRequired(initText: string) {
  return initText.includes(".notNull()");
}

function extractFieldInfo(prop: ObjectProperty, source: Parameters<typeof descriptionBefore>[0]) {
  const { text } = source;
  const fieldName = identifierKey(prop);
  if (fieldName === null) return null;

  const initExpr = prop.value;
  if (!isCall(initExpr)) return null;

  const fieldType = baseBuilderName(initExpr, text);
  const initText = textOf(text, initExpr);
  const description = descriptionBefore(source, prop.start);
  const keyType = extractKeyType(initText);

  return {
    name: fieldName,
    type: fieldType,
    keyType,
    description,
  };
}

function extractRelationFromField(prop: ObjectProperty, tableName: string, text: string) {
  const fieldName = identifierKey(prop);
  if (fieldName === null) return null;

  const initExpr = prop.value;
  if (!isCall(initExpr)) return null;

  const initText = textOf(text, initExpr);
  if (!initText.includes(".references(")) return null;

  const refInfo = extractReferenceInfo(initExpr);
  if (!refInfo) return null;

  const isRequired = isFieldRequired(initText);

  return {
    fromModel: refInfo.referencedTable,
    toModel: tableName,
    fromField: refInfo.referencedField,
    toField: fieldName,
    isRequired,
  };
}

// The entries of a table's third argument: `(t) => [index(...)]` or the older
// `(t) => ({ name: index(...) })`.
export function constraintEntries(arg: CallExpression["arguments"][number] | undefined) {
  if (!isArrow(arg)) return [];
  const body = arg.body.type === "BlockStatement" ? null : unwrapParens(arg.body);
  if (body?.type === "ArrayExpression") {
    return body.elements.filter((e): e is Expression => e !== null && e.type !== "SpreadElement");
  }
  const obj = arrowObject(arg);
  return obj ? obj.properties.filter(isPropertyAssignment).map((p) => p.value) : [];
}

// Pattern: foreignKey({ columns: [Table.field], foreignColumns: [OtherTable.field] })
function extractRelationsFromForeignKeyConstraints(
  tableName: string,
  constraintArg: CallExpression["arguments"][number],
  text: string,
) {
  return constraintEntries(constraintArg).flatMap((entry) => {
    const constraintText = textOf(text, entry);
    if (!constraintText.includes("foreignKey(")) return [];

    const columnsMatch = constraintText.match(/columns:\s*\[\s*(\w+)\.(\w+)\s*\]/);
    const foreignColumnsMatch = constraintText.match(/foreignColumns:\s*\[\s*(\w+)\.(\w+)\s*\]/);
    if (!columnsMatch || !foreignColumnsMatch) return [];

    return [
      {
        fromModel: foreignColumnsMatch[1],
        toModel: tableName,
        fromField: foreignColumnsMatch[2],
        toField: columnsMatch[2],
        // For foreignKey constraints, we assume required unless explicitly nullable
        isRequired: !constraintText.includes(".nullable()"),
      },
    ];
  });
}

function isFkLikeName(name: string) {
  const lower = name.toLowerCase();
  return (lower.endsWith("id") && lower !== "id") || lower.endsWith("_id");
}

// Pattern: relations(TableRef, ({ one, many }) => ({ ... }))
function extractRelationsFromRelationBlocks(program: Program, text: string) {
  return exportedDeclarations(program).flatMap(({ declarator }) => {
    const varName = declaratorName(declarator);
    if (varName === null || !varName.toLowerCase().includes("relation")) return [];

    const init = declarator.init;
    if (!isCall(init)) return [];
    if (textOf(text, init.callee) !== "relations") return [];

    const args = init.arguments;
    if (args.length < 2) return [];

    const tableRef = args[0];
    const arrowFn = args[1];
    if (tableRef.type !== "Identifier" || !isArrow(arrowFn)) return [];
    const tableName = tableRef.name;

    const objExpr = arrowObject(arrowFn);
    if (!objExpr) return [];

    return objExpr.properties.flatMap((prop) => {
      if (!isPropertyAssignment(prop)) return [];
      const initExpr = prop.value;
      if (!isCall(initExpr)) return [];
      // Only process 'one' relations (many doesn't have field info)
      if (textOf(text, initExpr.callee) !== "one") return [];

      const relArgs = initExpr.arguments;
      if (relArgs.length < 2) return [];
      const refTableArg = relArgs[0];
      const configArg = relArgs[1];
      if (refTableArg.type !== "Identifier" || !isObject(configArg)) return [];
      const refTable = refTableArg.name;

      const configText = textOf(text, configArg);
      const fieldsMatch = configText.match(/fields:\s*\[\s*(\w+)\.(\w+)\s*\]/);
      const referencesMatch = configText.match(/references:\s*\[\s*(\w+)\.(\w+)\s*\]/);
      if (!fieldsMatch || !referencesMatch) return [];

      const currentField = fieldsMatch[2];
      const refField = referencesMatch[2];
      const currentIsFk = isFkLikeName(currentField);
      const refIsFk = isFkLikeName(refField);

      // FK direction: the side with FK-looking field name is the child; default to current.
      if (!currentIsFk && refIsFk) {
        return [
          {
            fromModel: tableName, // Parent
            toModel: refTable, // Child
            fromField: currentField, // PK in parent
            toField: refField, // FK in child
            isRequired: true,
          },
        ] as const;
      }
      return [
        {
          fromModel: refTable,
          toModel: tableName,
          fromField: refField,
          toField: currentField,
          isRequired: true,
        },
      ] as const;
    });
  });
}

// The exported `xxxTable("name", { ...columns }, constraints)` calls, with the
// variable they are bound to.
export function tableCalls(program: Program, text: string) {
  return exportedDeclarations(program).flatMap(({ declarator, start, end }) => {
    const varName = declaratorName(declarator);
    if (varName === null || varName.toLowerCase().includes("relation")) return [];

    const init = declarator.init;
    if (!isCall(init)) return [];

    const callee = textOf(text, init.callee);
    if (!callee.endsWith("Table") || callee === "relations") return [];

    return [{ varName, args: init.arguments, start, end }];
  });
}

export function parseTableInfo(code: readonly string[]) {
  const source = parseSource(code);
  const { program, text } = source;

  return tableCalls(program, text).flatMap(({ varName, args, start }) => {
    const objLit = args[1];
    if (!isObject(objLit)) return [];

    const fields = objLit.properties
      .filter(isPropertyAssignment)
      .map((prop) => extractFieldInfo(prop, source))
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return [{ name: varName, description: descriptionBefore(source, start), fields }];
  });
}

// Sources scanned: .references() calls, foreignKey() constraints, relations() blocks
export function extractRelationsFromSchema(code: readonly string[]) {
  const { program, text } = parseSource(code);

  const tableRelations = tableCalls(program, text).flatMap(({ varName, args }) => {
    const objLit = args[1];
    const constraintArg = args[2];

    // Second argument: field definitions object
    const fieldRelations = isObject(objLit)
      ? objLit.properties
          .filter(isPropertyAssignment)
          .map((prop) => extractRelationFromField(prop, varName, text))
          .filter((r): r is NonNullable<typeof r> => r !== null)
      : [];

    // Third argument: constraints (foreignKey, indexes, etc.)
    const fkRelations = constraintArg
      ? extractRelationsFromForeignKeyConstraints(varName, constraintArg, text)
      : [];

    return [...fieldRelations, ...fkRelations];
  });

  const allRelations = [...tableRelations, ...extractRelationsFromRelationBlocks(program, text)];

  // Deduplicate relations based on fromModel.fromField -> toModel.toField
  const seen = new Set<string>();
  return allRelations.filter((r) => {
    const key = `${r.fromModel}.${r.fromField}->${r.toModel}.${r.toField}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
