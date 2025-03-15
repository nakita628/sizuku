import type { Relation, TableInfo } from '../type'
import { generateRelationLine } from './generate-relation-line'

const ER_HEADER = ['```mermaid', 'erDiagram'] as const
const ER_FOOTER = ['```'] as const

/**
 * Generate ER content
 * @function generateERContent
 * @param relations - The relations to generate the ER content from
 * @param tables - The tables to generate the ER content from
 * @returns The generated ER content
 */
export function generateERContent(relations: Relation[], tables: TableInfo[]) {
  const erContent = [
    ...ER_HEADER,
    ...relations.map(generateRelationLine),
    // Generate per-table definitions
    ...tables.flatMap((table) => [
      `    ${table.name} {`,
      ...table.fields.map(
        (field) =>
          `        ${field.type} ${field.name} ${field.description ? `"${field.description}"` : ''}`,
      ),
      '    }',
    ]),
    ...ER_FOOTER,
  ]

  return erContent.join('\n')
}
