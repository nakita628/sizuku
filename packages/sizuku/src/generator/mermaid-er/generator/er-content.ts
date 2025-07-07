import type { Relation, TableInfo } from '../types.js'
import { relationLine } from './index.js'

const ER_HEADER = ['```mermaid', 'erDiagram'] as const
const ER_FOOTER = ['```'] as const

/**
 * Generate ER content
 * @param relations - The relations to generate the ER content from
 * @param tables - The tables to generate the ER content from
 * @returns The generated ER content
 */
export function erContent(relations: Relation[], tables: TableInfo[]) {
  const erContent = [
    ...ER_HEADER,
    ...relations.map(relationLine),
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
