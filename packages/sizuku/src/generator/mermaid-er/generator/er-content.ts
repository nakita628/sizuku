import { relationLine } from './index.js'

const ER_HEADER = ['```mermaid', 'erDiagram'] as const
const ER_FOOTER = ['```'] as const

/**
 * Generate ER content
 * @param relations - The relations to generate the ER content from
 * @param tables - The tables to generate the ER content from
 * @returns The generated ER content
 */
export function erContent(
  relations: readonly {
    readonly fromModel: string
    readonly toModel: string
    readonly fromField: string
    readonly toField: string
    readonly type: string
  }[],
  tables: readonly {
    readonly name: string
    readonly fields: readonly {
      readonly type: string
      readonly name: string
      readonly description: string | null
    }[]
  }[],
): string {
  const content = [
    ...ER_HEADER,
    ...relations.map(relationLine),
    // Generate per-table definitions
    ...tables.flatMap((table) => [
      `    ${table.name} {`,
      ...table.fields.map(
        (field) =>
          `        ${field.type} ${field.name}${field.description ? ` "${field.description}"` : ''}`,
      ),
      '    }',
    ]),
    ...ER_FOOTER,
  ]

  return content.join('\n')
}
