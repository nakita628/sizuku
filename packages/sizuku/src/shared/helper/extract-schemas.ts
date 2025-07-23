import type { Node } from 'ts-morph'
import { Project } from 'ts-morph'

export function extractSchemas(
  lines: string[],
  extractFn: (
    declaration: Node,
    sourceText: string,
  ) => {
    name: string
    fields: {
      name: string
      definition: string
      description?: string
    }[]
  } | null,
): {
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
    .map((decl) => extractFn(decl, sourceText))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null)
}
