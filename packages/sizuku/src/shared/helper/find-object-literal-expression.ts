import type { ObjectLiteralExpression } from 'ts-morph'
import { Node } from 'ts-morph'

/**
 * Recursively extracts an `ObjectLiteralExpression` from a given AST node.
 *
 * Supports direct object literals, parenthesized expressions,
 * arrow functions returning object literals (including wrapped and block bodies).
 *
 * @param expr - The root `Node` to search.
 * @returns The found `ObjectLiteralExpression`, or `null` if not found.
 */
export function findObjectLiteralExpression(expr: Node): ObjectLiteralExpression | null {
  if (Node.isObjectLiteralExpression(expr)) return expr

  if (Node.isParenthesizedExpression(expr)) return findObjectLiteralExpression(expr.getExpression())

  if (Node.isArrowFunction(expr)) {
    const body = expr.getBody()

    if (Node.isObjectLiteralExpression(body)) return body

    if (Node.isParenthesizedExpression(body))
      return findObjectLiteralExpression(body.getExpression())

    if (Node.isBlock(body)) {
      const ret = body.getStatements().find(Node.isReturnStatement)
      if (ret && Node.isReturnStatement(ret)) {
        const re = ret.getExpression()
        return re && Node.isObjectLiteralExpression(re) ? re : null
      }
    }
  }

  return null
}
