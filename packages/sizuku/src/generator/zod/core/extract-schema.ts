import type { CallExpression, ObjectLiteralExpression } from 'ts-morph'
import { Node, Project } from 'ts-morph'
import { extractFieldComments, isMetadataComment } from '../../../shared/utils/index.js'

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
 * Convert table name to Schema name (e.g., 'user' -> 'UserSchema', 'post' -> 'PostSchema')
 */
const toSchemaName = (tableName: string): string =>
  `${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Schema`

/**
 * Extract relation field with type inference
 */
const extractRelationFieldFromProperty = (
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

  const fieldName = property.getName()
  if (!fieldName) return null

  const initializer = property.getInitializer()
  if (!Node.isCallExpression(initializer)) {
    return {
      name: fieldName,
      definition: '',
      description: undefined,
    }
  }

  const expression = initializer.getExpression()
  if (!Node.isIdentifier(expression)) {
    return {
      name: fieldName,
      definition: '',
      description: undefined,
    }
  }

  const functionName = expression.getText()
  const args = initializer.getArguments()

  if (args.length === 0) {
    return {
      name: fieldName,
      definition: '',
      description: undefined,
    }
  }

  const firstArg = args[0]
  if (!Node.isIdentifier(firstArg)) {
    return {
      name: fieldName,
      definition: '',
      description: undefined,
    }
  }

  const referencedTable = firstArg.getText()
  const schemaName = toSchemaName(referencedTable)

  const zodDefinition =
    functionName === 'many'
      ? `z.array(${schemaName})` // many(post) -> z.array(PostSchema)
      : functionName === 'one'
        ? schemaName // one(user, {...}) -> UserSchema
        : ''

  const fieldStartPos = property.getStart()
  const commentLines = extractFieldComments(sourceText, fieldStartPos)
  const { description } = parseFieldComments(commentLines)

  return {
    name: fieldName,
    definition: zodDefinition,
    description,
  }
}

/**
 * Extract object literal from any expression
 */
const extractObjectLiteralFromExpression = (expression: Node): ObjectLiteralExpression | null => {
  // Direct object literal
  if (Node.isObjectLiteralExpression(expression)) {
    return expression
  }

  if (Node.isParenthesizedExpression(expression)) {
    const inner = expression.getExpression()
    return Node.isObjectLiteralExpression(inner) ? inner : null
  }

  if (Node.isArrowFunction(expression)) {
    const body = expression.getBody()

    if (Node.isObjectLiteralExpression(body)) {
      return body
    }

    if (Node.isParenthesizedExpression(body)) {
      const inner = body.getExpression()
      return Node.isObjectLiteralExpression(inner) ? inner : null
    }

    if (Node.isBlock(body)) {
      const returnStatement = body.getStatements().find((stmt) => Node.isReturnStatement(stmt))
      if (returnStatement && Node.isReturnStatement(returnStatement)) {
        const returnExpression = returnStatement.getExpression()
        return returnExpression && Node.isObjectLiteralExpression(returnExpression)
          ? returnExpression
          : null
      }
    }
  }

  return null
}

/**
 * Find object literal in call expression arguments
 */
const findObjectLiteralInArgs = (callExpr: CallExpression): ObjectLiteralExpression | null => {
  const args = callExpr.getArguments()

  for (const arg of args) {
    const objectLiteral = extractObjectLiteralFromExpression(arg)
    if (objectLiteral) {
      return objectLiteral
    }
  }

  return null
}

/**
 * Determine if this is a relation-like function call
 */
const isRelationFunction = (callExpr: CallExpression): boolean => {
  const expression = callExpr.getExpression()
  if (!Node.isIdentifier(expression)) return false

  const functionName = expression.getText()
  return functionName === 'relations' || functionName.includes('relation')
}

/**
 * Extract fields from any call expression
 */
const extractFieldsFromCallExpression = (
  callExpr: CallExpression,
  sourceText: string,
): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}['fields'] => {
  const objectLiteral = findObjectLiteralInArgs(callExpr)
  if (!objectLiteral) return []

  const isRelation = isRelationFunction(callExpr)

  return objectLiteral
    .getProperties()
    .map((prop) =>
      isRelation
        ? extractRelationFieldFromProperty(prop, sourceText)
        : extractFieldFromProperty(prop, sourceText),
    )
    .filter((field): field is NonNullable<typeof field> => field !== null)
}

/**
 * Extract a single schema (variable declaration)
 */
const extractSchemaFromDeclaration = (
  declaration: Node,
  sourceText: string,
): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
} | null => {
  if (!Node.isVariableDeclaration(declaration)) return null

  const name = declaration.getName()
  if (!name) return null

  const initializer = declaration.getInitializer()

  if (Node.isCallExpression(initializer)) {
    if (isRelationFunction(initializer)) return null

    const fields = extractFieldsFromCallExpression(initializer, sourceText)
    return { name, fields }
  }

  if (Node.isObjectLiteralExpression(initializer)) {
    const fields = initializer
      .getProperties()
      .map((prop) => extractFieldFromProperty(prop, sourceText))
      .filter((field): field is NonNullable<typeof field> => field !== null)

    return { name, fields }
  }

  return { name, fields: [] }
}

/**
 * Extract schemas from lines of code
 * @param lines - Lines of code
 * @returns Schemas
 */
export function extractSchemas(lines: string[]): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}[] {
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
