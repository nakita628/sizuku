import type { ObjectLiteralExpression } from 'ts-morph'
import { Node } from 'ts-morph'

/**
 * Recursively extracts an `ObjectLiteralExpression` from a given AST node.
 *
 * This function supports multiple patterns for finding object literals:
 * - Direct object literals: `{ key: value }`
 * - Parenthesized expressions: `({ key: value })`
 * - Arrow functions returning object literals: `() => ({ key: value })`
 * - Arrow functions with block bodies: `() => { return { key: value } }`
 *
 * @param expr - The root `Node` to search for object literals
 * @returns The found `ObjectLiteralExpression`, or `null` if not found
 * 
 * @example
 * ```typescript
 * const obj = findObjectLiteralExpression(someNode)
 * if (obj) {
 *   // Process object literal properties
 *   const properties = obj.getProperties()
 * }
 * ```
 */
export function findObjectLiteralExpression(expr: Node): ObjectLiteralExpression | null {
  if (Node.isObjectLiteralExpression(expr)) return expr
  
  if (Node.isParenthesizedExpression(expr)) {
    return findObjectLiteralExpression(expr.getExpression())
  }
  
  if (Node.isArrowFunction(expr)) {
    const body = expr.getBody()
    
    if (Node.isObjectLiteralExpression(body)) return body
    
    if (Node.isParenthesizedExpression(body)) {
      return findObjectLiteralExpression(body.getExpression())
    }
    
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
