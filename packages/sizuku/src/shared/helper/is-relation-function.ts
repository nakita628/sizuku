import type { CallExpression } from 'ts-morph'
import { Node } from 'ts-morph'

/**
 * Determines whether a given `CallExpression` is a relation-related function call.
 *
 * This checks if the function name is either `"relations"` or contains the substring `"relation"`.
 *
 * @param callExpr - The call expression node to check.
 * @returns `true` if the function is a relation function; otherwise, `false`.
 */
export function isRelationFunctionCall(callExpr: CallExpression): boolean {
  const expression = callExpr.getExpression()
  if (!Node.isIdentifier(expression)) return false
  const functionName = expression.getText()
  return functionName === 'relations' || functionName.includes('relation')
}
