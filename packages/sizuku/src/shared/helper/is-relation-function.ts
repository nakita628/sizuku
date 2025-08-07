import type { CallExpression } from 'ts-morph'
import { Node } from 'ts-morph'

/**
 * Determines whether a given `CallExpression` is a relation-related function call.
 *
 * This function checks if the function name is either `"relations"` or contains
 * the substring `"relation"` to identify relation-related function calls in Drizzle schemas.
 *
 * @param callExpr - The call expression node to check for relation functions
 * @returns `true` if the function is a relation function; otherwise, `false`
 *
 * @example
 * ```typescript
 * const isRelation = isRelationFunctionCall(callExpression)
 * if (isRelation) {
 *   // Handle relation function call
 *   console.log('This is a relation function')
 * }
 * ```
 */
export function isRelationFunctionCall(callExpr: CallExpression): boolean {
  const expression = callExpr.getExpression()
  if (!Node.isIdentifier(expression)) return false

  const functionName = expression.getText()
  return functionName === 'relations' || functionName.includes('relation')
}
