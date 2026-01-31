/**
 * DBML content generator for Drizzle schemas
 *
 * Generates DBML (Database Markup Language) format from parsed table and relation info.
 * Uses utils-lab for common DBML generation functions.
 */

import {
  type DBMLColumn,
  type DBMLRef,
  type DBMLTable,
  generateDBMLContent,
  mapDrizzleType,
} from 'utils-lab'

type FieldInfo = {
  readonly name: string
  readonly type: string
  readonly keyType: 'PK' | 'FK' | null
  readonly description: string | null
}

type TableInfo = {
  readonly name: string
  readonly fields: readonly FieldInfo[]
}

type RelationInfo = {
  readonly fromModel: string
  readonly toModel: string
  readonly fromField: string
  readonly toField: string
  readonly isRequired: boolean
}

/**
 * Convert internal FieldInfo to DBMLColumn
 */
function toDBMLColumn(field: FieldInfo): DBMLColumn {
  return {
    name: field.name,
    type: mapDrizzleType(field.type),
    isPrimaryKey: field.keyType === 'PK',
    isIncrement: field.type.includes('serial'),
    note: field.description ?? undefined,
  }
}

/**
 * Convert internal TableInfo to DBMLTable
 */
function toDBMLTable(table: TableInfo): DBMLTable {
  return {
    name: table.name,
    columns: table.fields.map(toDBMLColumn),
  }
}

/**
 * Convert internal RelationInfo to DBMLRef
 */
function toDBMLRef(relation: RelationInfo): DBMLRef {
  return {
    fromTable: relation.toModel,
    fromColumn: relation.toField,
    toTable: relation.fromModel,
    toColumn: relation.fromField,
  }
}

/**
 * Generate complete DBML content
 *
 * @param relations - The relations extracted from the schema
 * @param tables - The tables to generate DBML from
 * @returns The generated DBML content
 */
export function dbmlContent(
  relations: readonly RelationInfo[],
  tables: readonly TableInfo[],
): string {
  return generateDBMLContent({
    tables: tables.map(toDBMLTable),
    refs: relations.map(toDBMLRef),
  })
}
