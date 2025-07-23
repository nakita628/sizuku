import { Node } from 'ts-morph'
import { extractFieldComments, schemaName } from '../utils/index.js'

export const createExtractRelationFieldFromProperty = (
  parseFieldComments: (lines: string[]) => { definition: string; description?: string },
  prefix: 'v' | 'z',
) => {
  return (
    property: Node,
    sourceText: string,
  ):
    | {
        name: string
        fields: {
          name: string
          definition: string
          description?: string
        }[]
      }['fields'][0]
    | null => {
    if (!Node.isPropertyAssignment(property)) return null
    const name = property.getName()
    if (!name) return null
    const init = property.getInitializer()
    if (!Node.isCallExpression(init)) return { name, definition: '', description: undefined }
    const expr = init.getExpression()
    if (!Node.isIdentifier(expr)) return { name, definition: '', description: undefined }
    const fnName = expr.getText()
    const args = init.getArguments()
    if (!(args.length && Node.isIdentifier(args[0]))) {
      return { name, definition: '', description: undefined }
    }
    const refTable = args[0].getText()
    const schema = schemaName(refTable)
    const definition =
      fnName === 'many' ? `${prefix}.array(${schema})` : fnName === 'one' ? schema : ''
    const { description } = parseFieldComments(
      extractFieldComments(sourceText, property.getStart()),
    )
    return { name, definition, description }
  }
}
