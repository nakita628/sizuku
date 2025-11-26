import type { Expression, PropertyAssignment } from 'ts-morph'
import { Node, Project } from 'ts-morph'

type FieldInfo = {
  readonly name: string
  readonly type: string
  readonly description: string | null
}

type TableInfo = {
  readonly name: string
  readonly fields: readonly FieldInfo[]
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
 * Extract field prefix based on field type.
 *
 * @param initText - The initializer text
 * @returns The field prefix
 */
function extractFieldPrefix(initText: string): string {
  if (initText.includes('.primaryKey()')) return '(PK) '
  if (initText.includes('.references(')) return '(FK) '
  return ''
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
          !t.includes('@relation')
        )
      })
      ?.replace(/^\s*\/\/\/\s*/, '') ?? ''
  )
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
  const prefix = extractFieldPrefix(initText)
  const description = immediateComment ? `${prefix}${immediateComment}`.trim() : null

  return {
    name: fieldName,
    type: fieldType,
    description,
  }
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
