import type { Schema } from '../../../shared/types.js'
import { Project, Node } from 'ts-morph'

/**
 * Check if comment contains metadata
 */
const isMetadataComment = (text: string): boolean => {
  return text.includes('@z.') || text.includes('@v.') || text.includes('@relation.')
}

/**
 * Extract field comments that appear before a specific line position
 */
const extractFieldComments = (sourceText: string, fieldStartPos: number): string[] => {
  const beforeField = sourceText.substring(0, fieldStartPos)
  const lines = beforeField.split('\n')

  const reverseIndex = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .reverse()
    .reduce<{ commentLines: string[]; shouldStop: boolean }>(
      (acc, { line }) => {
        if (acc.shouldStop) return acc

        if (line.startsWith('///')) {
          return {
            commentLines: [line, ...acc.commentLines],
            shouldStop: false,
          }
        }

        if (line === '') {
          return acc
        }

        return { ...acc, shouldStop: true }
      },
      { commentLines: [], shouldStop: false },
    )

  return reverseIndex.commentLines
}

/**
 * Parse comment lines and extract Zod definition and description
 */
const parseFieldComments = (
  commentLines: string[],
): { zodDefinition: string; description: string | undefined } => {
  const cleanLines = commentLines
    .map((line) => line.replace(/^\/\/\/\s*/, '').trim())
    .filter((line) => line.length > 0)

  const zodDefinition = cleanLines.find((line) => line.startsWith('@z.'))?.replace(/^@/, '') ?? ''

  const descriptionLines = cleanLines.filter((line) => !isMetadataComment(line))
  const description = descriptionLines.length > 0 ? descriptionLines.join(' ') : undefined

  return { zodDefinition, description }
}

/**
 * Extract field information from object property
 */
const extractFieldFromProperty = (
  property: Node,
  sourceText: string,
): Schema['fields'][0] | null => {
  if (!Node.isPropertyAssignment(property)) return null

  const fieldName = property.getName()
  if (!fieldName) return null

  const fieldStartPos = property.getStart()
  const commentLines = extractFieldComments(sourceText, fieldStartPos)
  const { zodDefinition, description } = parseFieldComments(commentLines)

  return {
    name: fieldName,
    definition: zodDefinition,
    description,
  }
}

/**
 * Extract schema from variable declaration
 */
const extractSchemaFromDeclaration = (declaration: Node, sourceText: string): Schema | null => {
  if (!Node.isVariableDeclaration(declaration)) return null

  const name = declaration.getName()
  if (!name) return null

  const initializer = declaration.getInitializer()
  if (!Node.isCallExpression(initializer)) {
    return { name, fields: [] }
  }

  const args = initializer.getArguments()
  if (args.length < 2) return { name, fields: [] }

  const objectLiteral = args[1]
  if (!Node.isObjectLiteralExpression(objectLiteral)) {
    return { name, fields: [] }
  }

  const fields = objectLiteral
    .getProperties()
    .map((prop) => extractFieldFromProperty(prop, sourceText))
    .filter((field): field is NonNullable<typeof field> => field !== null)

  return { name, fields }
}

/**
 * Extract schemas from lines of code
 * @param lines - Lines of code
 * @returns Schemas
 */
export function extractSchemas(lines: string[]): Schema[] {
  const sourceCode = lines.join('\n')

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      skipLibCheck: true,
    },
  })

  const sourceFile = project.createSourceFile('temp.ts', sourceCode)
  const sourceText = sourceFile.getFullText()

  return sourceFile
    .getVariableStatements()
    .filter((stmt) => stmt.hasExportKeyword())
    .flatMap((stmt) => stmt.getDeclarations())
    .map((decl) => extractSchemaFromDeclaration(decl, sourceText))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null)
}
