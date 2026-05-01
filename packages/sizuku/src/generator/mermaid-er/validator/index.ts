import type { CallExpression, Expression, PropertyAssignment, SourceFile } from "ts-morph";
import { Node, Project } from "ts-morph";

type FieldInfo = {
  readonly name: string;
  readonly type: string;
  readonly keyType: "PK" | "FK" | null;
  readonly description: string | null;
};

type RelationInfo = {
  readonly fromModel: string;
  readonly toModel: string;
  readonly fromField: string;
  readonly toField: string;
  readonly isRequired: boolean;
};

function relationKey(r: RelationInfo) {
  return `${r.fromModel}.${r.fromField}->${r.toModel}.${r.toField}`;
}

function baseBuilderName(expr: Expression): string {
  if (Node.isIdentifier(expr)) return expr.getText();
  if (Node.isCallExpression(expr) || Node.isPropertyAccessExpression(expr))
    return baseBuilderName(expr.getExpression());
  return "";
}

function isFieldInfo(v: FieldInfo | null): v is FieldInfo {
  return v !== null;
}

function extractKeyType(initText: string) {
  if (initText.includes(".primaryKey()")) return "PK" as const;
  if (initText.includes(".references(")) return "FK" as const;
  return null;
}

function findImmediateComment(code: readonly string[], lineIdx: number) {
  return (
    code
      .slice(0, lineIdx)
      .reverse()
      .find((line) => {
        const t = line.trim();
        return (
          t.startsWith("///") &&
          !t.includes("@z.") &&
          !t.includes("@v.") &&
          !t.includes("@a.") &&
          !t.includes("@e.") &&
          !t.includes("@relation")
        );
      })
      ?.replace(/^\s*\/\/\/\s*/, "") ?? ""
  );
}

function extractReferenceInfo(initExpr: CallExpression) {
  const initText = initExpr.getText();
  const match = initText.match(/\.references\(\s*\(\)\s*=>\s*(\w+)\.(\w+)\s*\)/);
  if (!match) return null;
  return {
    referencedTable: match[1],
    referencedField: match[2],
  };
}

function isFieldRequired(initText: string) {
  return initText.includes(".notNull()");
}

function extractFieldInfo(prop: PropertyAssignment, code: readonly string[]) {
  const keyNode = prop.getNameNode();
  if (!Node.isIdentifier(keyNode)) return null;
  const fieldName = keyNode.getText();

  const initExpr = prop.getInitializer();
  if (!(initExpr && Node.isCallExpression(initExpr))) return null;

  const fieldType = baseBuilderName(initExpr);
  const initText = initExpr.getText();
  const lineIdx = prop.getStartLineNumber() - 1;

  const immediateComment = findImmediateComment(code, lineIdx);
  const keyType = extractKeyType(initText);

  return {
    name: fieldName,
    type: fieldType,
    keyType,
    description: immediateComment || null,
  };
}

function extractRelationFromField(prop: PropertyAssignment, tableName: string) {
  const keyNode = prop.getNameNode();
  if (!Node.isIdentifier(keyNode)) return null;
  const fieldName = keyNode.getText();

  const initExpr = prop.getInitializer();
  if (!(initExpr && Node.isCallExpression(initExpr))) return null;

  const initText = initExpr.getText();
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

// Pattern: foreignKey({ columns: [Table.field], foreignColumns: [OtherTable.field] })
function extractRelationsFromForeignKeyConstraints(
  tableName: string,
  constraintArg: Expression,
): RelationInfo[] {
  // Handle arrow function: (Table) => ({ ... })
  if (!Node.isArrowFunction(constraintArg)) return [];
  const body = constraintArg.getBody();
  if (!body) return [];
  // Handle parenthesized expression: ({ ... })
  const objExpr = Node.isParenthesizedExpression(body) ? body.getExpression() : body;
  if (!Node.isObjectLiteralExpression(objExpr)) return [];

  return objExpr.getProperties().flatMap((prop) => {
    if (!Node.isPropertyAssignment(prop)) return [];
    const initExpr = prop.getInitializer();
    if (!initExpr) return [];
    const text = initExpr.getText();
    if (!text.includes("foreignKey(")) return [];

    const columnsMatch = text.match(/columns:\s*\[\s*(\w+)\.(\w+)\s*\]/);
    const foreignColumnsMatch = text.match(/foreignColumns:\s*\[\s*(\w+)\.(\w+)\s*\]/);
    if (!columnsMatch || !foreignColumnsMatch) return [];

    return [
      {
        fromModel: foreignColumnsMatch[1],
        toModel: tableName,
        fromField: foreignColumnsMatch[2],
        toField: columnsMatch[2],
        // For foreignKey constraints, we assume required unless explicitly nullable
        isRequired: !text.includes(".nullable()"),
      },
    ];
  });
}

function isFkLikeName(name: string) {
  const lower = name.toLowerCase();
  return (lower.endsWith("id") && lower !== "id") || lower.endsWith("_id");
}

// Pattern: relations(TableRef, ({ one, many }) => ({ ... }))
function extractRelationsFromRelationBlocks(file: SourceFile): RelationInfo[] {
  return file
    .getVariableStatements()
    .filter((stmt) => stmt.isExported())
    .flatMap((stmt) => {
      const decl = stmt.getDeclarations()[0];
      if (!Node.isVariableDeclaration(decl)) return [];
      const varName = decl.getName();
      if (!varName.toLowerCase().includes("relation")) return [];

      const init = decl.getInitializer();
      if (!(init && Node.isCallExpression(init))) return [];
      if (init.getExpression().getText() !== "relations") return [];

      const args = init.getArguments();
      if (args.length < 2) return [];

      const tableRef = args[0];
      const arrowFn = args[1];
      if (!Node.isIdentifier(tableRef) || !Node.isArrowFunction(arrowFn)) return [];
      const tableName = tableRef.getText();

      const body = arrowFn.getBody();
      if (!body) return [];
      const objExpr = Node.isParenthesizedExpression(body) ? body.getExpression() : body;
      if (!Node.isObjectLiteralExpression(objExpr)) return [];

      return objExpr.getProperties().flatMap((prop) => {
        if (!Node.isPropertyAssignment(prop)) return [];
        const initExpr = prop.getInitializer();
        if (!(initExpr && Node.isCallExpression(initExpr))) return [];
        // Only process 'one' relations (many doesn't have field info)
        if (initExpr.getExpression().getText() !== "one") return [];

        const relArgs = initExpr.getArguments();
        if (relArgs.length < 2) return [];
        const refTableArg = relArgs[0];
        const configArg = relArgs[1];
        if (!Node.isIdentifier(refTableArg) || !Node.isObjectLiteralExpression(configArg)) {
          return [];
        }
        const refTable = refTableArg.getText();

        const configText = configArg.getText();
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
          ];
        }
        return [
          {
            fromModel: refTable,
            toModel: tableName,
            fromField: refField,
            toField: currentField,
            isRequired: true,
          },
        ];
      });
    });
}

export function parseTableInfo(code: readonly string[]) {
  const source = code.join("\n");
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile("temp.ts", source);

  return file
    .getVariableStatements()
    .filter((stmt) => stmt.isExported())
    .flatMap((stmt) => {
      const decl = stmt.getDeclarations()[0];
      if (!Node.isVariableDeclaration(decl)) return [];

      const varName = decl.getName();
      if (varName.toLowerCase().includes("relation")) return [];

      const init = decl.getInitializer();
      if (!(init && Node.isCallExpression(init))) return [];

      const callee = init.getExpression().getText();
      if (!callee.endsWith("Table") || callee === "relations") return [];

      const objLit = init.getArguments()[1];
      if (!(objLit && Node.isObjectLiteralExpression(objLit))) return [];

      const fields = objLit
        .getProperties()
        .filter(Node.isPropertyAssignment)
        .map((prop) => extractFieldInfo(prop, code))
        .filter(isFieldInfo);

      return [{ name: varName, fields }];
    });
}

// Sources scanned: .references() calls, foreignKey() constraints, relations() blocks
export function extractRelationsFromSchema(code: readonly string[]) {
  const source = code.join("\n");
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile("temp.ts", source);

  const tableRelations = file
    .getVariableStatements()
    .filter((stmt) => stmt.isExported())
    .flatMap((stmt): RelationInfo[] => {
      const decl = stmt.getDeclarations()[0];
      if (!Node.isVariableDeclaration(decl)) return [];
      const varName = decl.getName();
      if (varName.toLowerCase().includes("relation")) return [];

      const init = decl.getInitializer();
      if (!(init && Node.isCallExpression(init))) return [];
      const callee = init.getExpression().getText();
      if (!callee.endsWith("Table") || callee === "relations") return [];

      const args = init.getArguments();
      const objLit = args[1];
      const constraintArg = args[2];

      // Second argument: field definitions object
      const fieldRelations =
        objLit && Node.isObjectLiteralExpression(objLit)
          ? objLit
              .getProperties()
              .filter(Node.isPropertyAssignment)
              .map((prop) => extractRelationFromField(prop, varName))
              .filter((r): r is RelationInfo => r !== null)
          : [];

      // Third argument: constraints (foreignKey, indexes, etc.)
      const fkRelations =
        constraintArg && Node.isExpression(constraintArg)
          ? extractRelationsFromForeignKeyConstraints(varName, constraintArg)
          : [];

      return [...fieldRelations, ...fkRelations];
    });

  const allRelations = [...tableRelations, ...extractRelationsFromRelationBlocks(file)];

  // Deduplicate relations based on fromModel.fromField -> toModel.toField
  return allRelations.filter(
    (r, i) => allRelations.findIndex((x) => relationKey(x) === relationKey(r)) === i,
  );
}
