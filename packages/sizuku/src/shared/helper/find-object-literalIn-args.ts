import type { CallExpression, Node, ObjectLiteralExpression } from 'ts-morph'

export function findObjectLiteralInArgs(
  call: CallExpression,
  finder: (expr: Node) => ObjectLiteralExpression | null,
): ObjectLiteralExpression | null {
  for (const arg of call.getArguments()) {
    const obj = finder(arg)
    if (obj) return obj
  }
  return null
}
