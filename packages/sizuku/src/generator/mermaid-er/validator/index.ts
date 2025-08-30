import type { Expression } from 'ts-morph'
import { Node, Project } from 'ts-morph'

type FieldInfo = {
  name: string
  type: string
  description: string | null
}

const baseBuilderName = (expr: Expression): string => {
  if (Node.isIdentifier(expr)) return expr.getText()
  if (Node.isCallExpression(expr) || Node.isPropertyAccessExpression(expr))
    return baseBuilderName(expr.getExpression())
  return ''
}

const isFieldInfo = (v: FieldInfo | null): v is FieldInfo => v !== null

export function parseTableInfo(code: string[]): {
  name: string
  fields: {
    type: string
    name: string
    description: string | null
  }[]
}[] {
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
        .map((prop) => {
          const keyNode = prop.getNameNode()
          if (!Node.isIdentifier(keyNode)) return null
          const fieldName = keyNode.getText()

          const initExpr = prop.getInitializer()
          if (!(initExpr && Node.isCallExpression(initExpr))) return null

          const fieldType = baseBuilderName(initExpr)

          const initText = initExpr.getText()
          const lineIdx = prop.getStartLineNumber() - 1

          // Find the immediate comment above this field
          const immediateComment =
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

          const prefix = initText.includes('.primaryKey()')
            ? '(PK) '
            : initText.includes('.references(')
              ? '(FK) '
              : ''

          // Only include description if there's a comment
          const description = immediateComment ? `${prefix}${immediateComment}`.trim() : null

          return {
            name: fieldName,
            type: fieldType,
            description,
          }
        })
        .filter(isFieldInfo)

      return [{ name: varName, fields }]
    })
}
