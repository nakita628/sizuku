import type { CallExpression, Expression, PropertyAssignment, SourceFile } from 'ts-morph'
import { Node, Project } from 'ts-morph'

type FieldInfo = {
  readonly name: string
  readonly type: string
  readonly keyType: 'PK' | 'FK' | null
  readonly description: string | null
}

type TableInfo = {
  readonly name: string
  readonly fields: readonly FieldInfo[]
}

type RelationInfo = {
  readonly fromModel: string
  readonly toModel: string
  readonly fromField: string
  readonly toField: string
  readonly isRequired: boolean
}

/**
 * Create a unique key for relation deduplication.
 */
function relationKey(r: RelationInfo): string {
  return `${r.fromModel}.${r.fromField}->${r.toModel}.${r.toField}`
}

/**
 * Extract base builder name from expression.
 *
 * @param expr - The expression to extract name from
 * @returns The base builder name
 */
function baseBuilderName(expr: Expression): string {
  if (Node.isIdentifier(expr)) return expr.getText()
  if (Node.isCallExpression(expr) || Node.isPropertyAccessExpression(expr))
    return baseBuilderName(expr.getExpression())
  return ''
}

/**
 * Type guard for FieldInfo.
 *
 * @param v - The value to check
 * @returns True if value is FieldInfo
 */
function isFieldInfo(v: FieldInfo | null): v is FieldInfo {
  return v !== null
}

/**
 * Extract key type based on field definition.
 *
 * @param initText - The initializer text
 * @returns The key type (PK, FK, or null)
 */
function extractKeyType(initText: string): 'PK' | 'FK' | null {
  if (initText.includes('.primaryKey()')) return 'PK'
  if (initText.includes('.references(')) return 'FK'
  return null
}

/**
 * Find immediate comment for a field.
 *
 * @param code - The source code lines
 * @param lineIdx - The line index of the field
 * @returns The immediate comment or empty string
 */
function findImmediateComment(code: readonly string[], lineIdx: number): string {
  return (
    code
      .slice(0, lineIdx)
      .reverse()
      .find((line) => {
        const t = line.trim()
        return (
          t.startsWith('///') &&
          !t.includes('@z.') &&
          !t.includes('@v.') &&
          !t.includes('@a.') &&
          !t.includes('@e.') &&
          !t.includes('@relation')
        )
      })
      ?.replace(/^\s*\/\/\/\s*/, '') ?? ''
  )
}

/**
 * Extract reference info from a .references() call.
 *
 * @param initExpr - The call expression to analyze
 * @returns The reference info or null
 */
function extractReferenceInfo(
  initExpr: CallExpression,
): { referencedTable: string; referencedField: string } | null {
  const initText = initExpr.getText()
  // Match .references(() => tableName.fieldName)
  const match = initText.match(/\.references\(\s*\(\)\s*=>\s*(\w+)\.(\w+)\s*\)/)
  if (match) {
    return {
      referencedTable: match[1],
      referencedField: match[2],
    }
  }
  return null
}

/**
 * Check if field is required (notNull).
 *
 * @param initText - The initializer text
 * @returns True if field is required
 */
function isFieldRequired(initText: string): boolean {
  return initText.includes('.notNull()')
}

/**
 * Extract field info from property assignment.
 *
 * @param prop - The property assignment node
 * @param code - The source code lines
 * @returns Field info or null
 */
function extractFieldInfo(prop: PropertyAssignment, code: readonly string[]): FieldInfo | null {
  const keyNode = prop.getNameNode()
  if (!Node.isIdentifier(keyNode)) return null
  const fieldName = keyNode.getText()

  const initExpr = prop.getInitializer()
  if (!(initExpr && Node.isCallExpression(initExpr))) return null

  const fieldType = baseBuilderName(initExpr)
  const initText = initExpr.getText()
  const lineIdx = prop.getStartLineNumber() - 1

  const immediateComment = findImmediateComment(code, lineIdx)
  const keyType = extractKeyType(initText)

  return {
    name: fieldName,
    type: fieldType,
    keyType,
    description: immediateComment || null,
  }
}

/**
 * Extract relation info from a property assignment with .references().
 *
 * @param prop - The property assignment node
 * @param tableName - The name of the current table
 * @returns Relation info or null
 */
function extractRelationFromField(
  prop: PropertyAssignment,
  tableName: string,
): RelationInfo | null {
  const keyNode = prop.getNameNode()
  if (!Node.isIdentifier(keyNode)) return null
  const fieldName = keyNode.getText()

  const initExpr = prop.getInitializer()
  if (!(initExpr && Node.isCallExpression(initExpr))) return null

  const initText = initExpr.getText()
  if (!initText.includes('.references(')) return null

  const refInfo = extractReferenceInfo(initExpr)
  if (!refInfo) return null

  const isRequired = isFieldRequired(initText)

  return {
    fromModel: refInfo.referencedTable,
    toModel: tableName,
    fromField: refInfo.referencedField,
    toField: fieldName,
    isRequired,
  }
}

/**
 * Extract relations from foreignKey() constraints in the third argument.
 *
 * Pattern:
 * foreignKey({
 *   columns: [TableName.fieldName],
 *   foreignColumns: [OtherTable.fieldName],
 * })
 *
 * @param tableName - The name of the current table
 * @param constraintArg - The third argument (arrow function returning constraints object)
 * @returns Array of relation info
 */
function extractRelationsFromForeignKeyConstraints(
  tableName: string,
  constraintArg: Expression,
): RelationInfo[] {
  const relations: RelationInfo[] = []

  // Handle arrow function: (Table) => ({ ... })
  if (!Node.isArrowFunction(constraintArg)) return relations

  const body = constraintArg.getBody()
  if (!body) return relations

  // Handle parenthesized expression: ({ ... })
  let objExpr = body
  if (Node.isParenthesizedExpression(objExpr)) {
    objExpr = objExpr.getExpression()
  }

  if (!Node.isObjectLiteralExpression(objExpr)) return relations

  // Find all foreignKey() calls in the object
  objExpr.getProperties().forEach((prop) => {
    if (!Node.isPropertyAssignment(prop)) return

    const initExpr = prop.getInitializer()
    if (!initExpr) return

    // Get the full text and look for foreignKey pattern
    const text = initExpr.getText()
    if (!text.includes('foreignKey(')) return

    // Extract columns: [Table.field] and foreignColumns: [OtherTable.field]
    // Pattern: columns: [TableName.fieldName]
    const columnsMatch = text.match(/columns:\s*\[\s*(\w+)\.(\w+)\s*\]/)
    const foreignColumnsMatch = text.match(/foreignColumns:\s*\[\s*(\w+)\.(\w+)\s*\]/)

    if (columnsMatch && foreignColumnsMatch) {
      const toField = columnsMatch[2] // Field in current table
      const fromModel = foreignColumnsMatch[1] // Referenced table
      const fromField = foreignColumnsMatch[2] // Referenced field

      // Check if the foreignKey has .notNull() in the chain (usually it doesn't, but the field does)
      // For foreignKey constraints, we assume required unless explicitly marked
      const isRequired = !text.includes('.nullable()')

      relations.push({
        fromModel,
        toModel: tableName,
        fromField,
        toField,
        isRequired,
      })
    }
  })

  return relations
}

/**
 * Extract relations from relations() helper blocks.
 *
 * Pattern:
 * relations(TableRef, ({ one, many }) => ({
 *   user: one(User, {
 *     fields: [Post.userId],
 *     references: [User.id],
 *   }),
 *   posts: many(Post),
 * }))
 *
 * @param file - The source file
 * @returns Array of relation info
 */
function extractRelationsFromRelationBlocks(file: SourceFile): RelationInfo[] {
  const relations: RelationInfo[] = []

  file
    .getVariableStatements()
    .filter((stmt) => stmt.isExported())
    .forEach((stmt) => {
      const decl = stmt.getDeclarations()[0]
      if (!Node.isVariableDeclaration(decl)) return

      const varName = decl.getName()
      // Only process relation definitions
      if (!varName.toLowerCase().includes('relation')) return

      const init = decl.getInitializer()
      if (!(init && Node.isCallExpression(init))) return

      const callee = init.getExpression().getText()
      if (callee !== 'relations') return

      const args = init.getArguments()
      if (args.length < 2) return

      // First arg is the table reference
      const tableRef = args[0]
      if (!Node.isIdentifier(tableRef)) return
      const tableName = tableRef.getText()

      // Second arg is the arrow function
      const arrowFn = args[1]
      if (!Node.isArrowFunction(arrowFn)) return

      const body = arrowFn.getBody()
      if (!body) return

      // Handle parenthesized expression: ({ ... })
      let objExpr = body
      if (Node.isParenthesizedExpression(objExpr)) {
        objExpr = objExpr.getExpression()
      }

      if (!Node.isObjectLiteralExpression(objExpr)) return

      // Process each relation definition
      objExpr.getProperties().forEach((prop) => {
        if (!Node.isPropertyAssignment(prop)) return

        const initExpr = prop.getInitializer()
        if (!(initExpr && Node.isCallExpression(initExpr))) return

        const fnName = initExpr.getExpression().getText()
        // Only process 'one' relations (many doesn't have field info)
        if (fnName !== 'one') return

        const relArgs = initExpr.getArguments()
        if (relArgs.length < 2) return

        // First arg is the referenced table
        const refTableArg = relArgs[0]
        if (!Node.isIdentifier(refTableArg)) return
        const refTable = refTableArg.getText()

        // Second arg is the config object
        const configArg = relArgs[1]
        if (!Node.isObjectLiteralExpression(configArg)) return

        const configText = configArg.getText()

        // Extract fields: [Table.field] and references: [OtherTable.field]
        const fieldsMatch = configText.match(/fields:\s*\[\s*(\w+)\.(\w+)\s*\]/)
        const referencesMatch = configText.match(/references:\s*\[\s*(\w+)\.(\w+)\s*\]/)

        if (fieldsMatch && referencesMatch) {
          const currentField = fieldsMatch[2] // Field in current table
          const refField = referencesMatch[2] // Field in referenced table

          // Determine FK direction based on field naming patterns:
          // - If current field looks like a FK (ends with Id/ID and isn't just "id"),
          //   then current table is the child
          // - If ref field looks like a FK, then ref table is the child
          const currentFieldLower = currentField.toLowerCase()
          const refFieldLower = refField.toLowerCase()
          const isCurrentFieldFk =
            (currentFieldLower.endsWith('id') && currentFieldLower !== 'id') ||
            currentFieldLower.endsWith('_id')
          const isRefFieldFk =
            (refFieldLower.endsWith('id') && refFieldLower !== 'id') ||
            refFieldLower.endsWith('_id')

          if (isCurrentFieldFk && !isRefFieldFk) {
            // Current table has the FK, ref table is the parent
            relations.push({
              fromModel: refTable, // Parent
              toModel: tableName, // Child
              fromField: refField, // PK in parent
              toField: currentField, // FK in child
              isRequired: true,
            })
          } else if (!isCurrentFieldFk && isRefFieldFk) {
            // Ref table has the FK, current table is the parent
            // This is when relation is defined from parent's perspective
            relations.push({
              fromModel: tableName, // Parent
              toModel: refTable, // Child
              fromField: currentField, // PK in parent
              toField: refField, // FK in child
              isRequired: true,
            })
          } else {
            // Ambiguous case - use current table as child (default behavior)
            relations.push({
              fromModel: refTable,
              toModel: tableName,
              fromField: refField,
              toField: currentField,
              isRequired: true,
            })
          }
        }
      })
    })

  return relations
}

/**
 * Parse table information from Drizzle schema code.
 *
 * @param code - Array of source code lines
 * @returns Array of table information
 */
export function parseTableInfo(code: readonly string[]): readonly TableInfo[] {
  const source = code.join('\n')
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile('temp.ts', source)

  return file
    .getVariableStatements()
    .filter((stmt) => stmt.isExported())
    .flatMap((stmt) => {
      const decl = stmt.getDeclarations()[0]
      if (!Node.isVariableDeclaration(decl)) return []

      const varName = decl.getName()
      if (varName.toLowerCase().includes('relation')) return []

      const init = decl.getInitializer()
      if (!(init && Node.isCallExpression(init))) return []

      const callee = init.getExpression().getText()
      if (!callee.endsWith('Table') || callee === 'relations') return []

      const objLit = init.getArguments()[1]
      if (!(objLit && Node.isObjectLiteralExpression(objLit))) return []

      const fields = objLit
        .getProperties()
        .filter(Node.isPropertyAssignment)
        .map((prop) => extractFieldInfo(prop, code))
        .filter(isFieldInfo)

      return [{ name: varName, fields }]
    })
}

/**
 * Extract relations from Drizzle schema code by analyzing:
 * 1. .references() calls on fields
 * 2. foreignKey() constraints in table definition
 * 3. relations() helper blocks
 *
 * @param code - Array of source code lines
 * @returns Array of relation information (deduplicated)
 */
export function extractRelationsFromSchema(code: readonly string[]): readonly RelationInfo[] {
  const source = code.join('\n')
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile('temp.ts', source)

  const relations: RelationInfo[] = []

  // 1. Extract from .references() calls and foreignKey() constraints in table definitions
  file
    .getVariableStatements()
    .filter((stmt) => stmt.isExported())
    .forEach((stmt) => {
      const decl = stmt.getDeclarations()[0]
      if (!Node.isVariableDeclaration(decl)) return

      const varName = decl.getName()
      if (varName.toLowerCase().includes('relation')) return

      const init = decl.getInitializer()
      if (!(init && Node.isCallExpression(init))) return

      const callee = init.getExpression().getText()
      if (!callee.endsWith('Table') || callee === 'relations') return

      const args = init.getArguments()

      // Second argument: field definitions object
      const objLit = args[1]
      if (objLit && Node.isObjectLiteralExpression(objLit)) {
        objLit
          .getProperties()
          .filter(Node.isPropertyAssignment)
          .forEach((prop) => {
            const relation = extractRelationFromField(prop, varName)
            if (relation) {
              relations.push(relation)
            }
          })
      }

      // Third argument: constraints (foreignKey, indexes, etc.)
      const constraintArg = args[2]
      if (constraintArg) {
        const fkRelations = extractRelationsFromForeignKeyConstraints(varName, constraintArg)
        relations.push(...fkRelations)
      }
    })

  // 2. Extract from relations() blocks
  const relationBlockRelations = extractRelationsFromRelationBlocks(file)
  relations.push(...relationBlockRelations)

  // Deduplicate relations based on fromModel.fromField -> toModel.toField
  const seen = new Set<string>()
  return relations.filter((r) => {
    const key = relationKey(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
