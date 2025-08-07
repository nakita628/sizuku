import type { Node } from 'ts-morph'
import { Project } from 'ts-morph'

/**
 * Schema extraction result type containing table name and field definitions.
 */
export type SchemaExtractionResult = {
  /** The name of the table/schema */
  name: string
  /** Array of field definitions with name, validation definition, and description */
  fields: {
    /** Field name */
    name: string
    /** Validation definition (e.g., 'z.uuid()', 'v.pipe(v.string(), v.uuid())') */
    definition: string
    /** Optional field description from comments */
    description?: string
  }[]
}

/**
 * Schema extractor function type for processing variable declarations.
 */
export type SchemaExtractor = (
  declaration: Node,
  sourceText: string,
) => SchemaExtractionResult | null

/**
 * Extracts schemas from TypeScript source code using AST analysis.
 *
 * This function processes exported variable declarations to extract table schemas
 * with their field definitions and comments.
 *
 * @param lines - Array of source code lines to process
 * @param extractFn - Function to extract schema from variable declaration
 * @returns Array of extracted schemas with field definitions
 *
 * @example
 * ```typescript
 * const schemas = extractSchemas(sourceLines, myExtractor)
 * // Returns: [{ name: 'user', fields: [{ name: 'id', definition: 'z.uuid()', description: 'Primary key' }] }]
 * ```
 */
export function extractSchemas(
  lines: string[],
  extractFn: SchemaExtractor,
): SchemaExtractionResult[] {
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
    .map((decl) => extractFn(decl, sourceText))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null)
}
