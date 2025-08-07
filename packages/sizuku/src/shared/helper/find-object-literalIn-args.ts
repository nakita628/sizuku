import type { CallExpression, Node, ObjectLiteralExpression } from 'ts-morph'

/**
 * Object literal finder function type for locating object literals in AST nodes.
 */
export type ObjectLiteralFinder = (expr: Node) => ObjectLiteralExpression | null

/**
 * Finds an object literal expression in call expression arguments.
 *
 * This function iterates through the arguments of a call expression and uses
 * a provided finder function to locate object literals within those arguments.
 *
 * @param call - The call expression to search for object literals in its arguments
 * @param finder - Function to find object literal in a node
 * @returns The found object literal, or `null` if not found in any argument
 *
 * @example
 * ```typescript
 * const obj = findObjectLiteralInArgs(callExpression, findObjectLiteralExpression)
 * if (obj) {
 *   // Process the found object literal
 *   const properties = obj.getProperties()
 * }
 * ```
 */
export function findObjectLiteralInArgs(
  call: CallExpression,
  finder: ObjectLiteralFinder,
): ObjectLiteralExpression | null {
  for (const arg of call.getArguments()) {
    const obj = finder(arg)
    if (obj) return obj
  }
  return null
}
