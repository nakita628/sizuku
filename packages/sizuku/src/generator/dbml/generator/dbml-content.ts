/**
 * DBML content generator for Drizzle schemas
 *
 * Generates DBML (Database Markup Language) format from parsed table and relation info.
 */

// ============================================================================
// Types
// ============================================================================

type DBMLColumn = {
  readonly name: string
  readonly type: string
  readonly isPrimaryKey?: boolean
  readonly isUnique?: boolean
  readonly isNotNull?: boolean
  readonly isIncrement?: boolean
  readonly defaultValue?: string
  readonly note?: string
}

type DBMLTable = {
  readonly name: string
  readonly columns: readonly DBMLColumn[]
  readonly note?: string
}

type DBMLRef = {
  readonly name?: string
  readonly fromTable: string
  readonly fromColumn: string
  readonly toTable: string
  readonly toColumn: string
  /** Relation type: '>' many-to-one, '<' one-to-many, '-' one-to-one */
  readonly type?: '>' | '<' | '-'
  readonly onDelete?: string
  readonly onUpdate?: string
}

type DBMLEnum = {
  readonly name: string
  readonly values: readonly string[]
}

type DBMLContentOptions = {
  readonly tables: readonly DBMLTable[]
  readonly enums?: readonly DBMLEnum[]
  readonly refs?: readonly DBMLRef[]
}

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

// ============================================================================
// Drizzle Type Mapping
// ============================================================================

/**
 * Map Drizzle column types to DBML types
 */
function mapDrizzleType(drizzleType: string): string {
  const typeMap: Record<string, string> = {
    serial: 'serial',
    smallserial: 'smallserial',
    bigserial: 'bigserial',
    integer: 'integer',
    int: 'integer',
    smallint: 'smallint',
    bigint: 'bigint',
    boolean: 'boolean',
    text: 'text',
    varchar: 'varchar',
    char: 'char',
    numeric: 'numeric',
    decimal: 'decimal',
    real: 'real',
    doublePrecision: 'double precision',
    json: 'json',
    jsonb: 'jsonb',
    timestamp: 'timestamp',
    timestamptz: 'timestamptz',
    date: 'date',
    time: 'time',
    interval: 'interval',
    uuid: 'uuid',
    blob: 'blob',
    bytea: 'bytea',
  }

  return typeMap[drizzleType] ?? drizzleType
}

// ============================================================================
// DBML Generation Helpers
// ============================================================================

function escapeNote(str: string): string {
  return str.replace(/'/g, "\\'")
}

function quote(value: string): string {
  return `'${escapeNote(value)}'`
}

function buildColumnConstraints(column: DBMLColumn): readonly string[] {
  const constraints: string[] = []

  if (column.isPrimaryKey) {
    constraints.push('pk')
  }

  if (column.isIncrement) {
    constraints.push('increment')
  }

  if (column.isUnique) {
    constraints.push('unique')
  }

  if (column.isNotNull && !column.isPrimaryKey) {
    constraints.push('not null')
  }

  if (column.defaultValue !== undefined) {
    constraints.push(`default: ${column.defaultValue}`)
  }

  if (column.note) {
    constraints.push(`note: ${quote(column.note)}`)
  }

  return constraints
}

function formatConstraints(constraints: readonly string[]): string {
  return constraints.length > 0 ? ` [${constraints.join(', ')}]` : ''
}

function generateColumn(column: DBMLColumn): string {
  const constraints = buildColumnConstraints(column)
  return `  ${column.name} ${column.type}${formatConstraints(constraints)}`
}

function generateTable(table: DBMLTable): string {
  const lines: string[] = []

  lines.push(`Table ${table.name} {`)

  for (const column of table.columns) {
    lines.push(generateColumn(column))
  }

  if (table.note) {
    lines.push('')
    lines.push(`  Note: ${quote(table.note)}`)
  }

  lines.push('}')

  return lines.join('\n')
}

function generateEnum(enumDef: DBMLEnum): string {
  const lines: string[] = []

  lines.push(`Enum ${enumDef.name} {`)

  for (const value of enumDef.values) {
    lines.push(`  ${value}`)
  }

  lines.push('}')

  return lines.join('\n')
}

function generateRefName(ref: DBMLRef): string {
  return ref.name ?? `${ref.fromTable}_${ref.fromColumn}_${ref.toTable}_${ref.toColumn}_fk`
}

function generateRef(ref: DBMLRef): string {
  const name = generateRefName(ref)
  const operator = ref.type ?? '>'
  const actions: string[] = []

  if (ref.onDelete) {
    actions.push(`delete: ${ref.onDelete}`)
  }

  if (ref.onUpdate) {
    actions.push(`update: ${ref.onUpdate}`)
  }

  const actionStr = actions.length > 0 ? ` [${actions.join(', ')}]` : ''

  return `Ref ${name}: ${ref.fromTable}.${ref.fromColumn} ${operator} ${ref.toTable}.${ref.toColumn}${actionStr}`
}

function generateDBMLContent(options: DBMLContentOptions): string {
  const sections: string[] = []

  if (options.enums) {
    for (const enumDef of options.enums) {
      sections.push(generateEnum(enumDef))
    }
  }

  for (const table of options.tables) {
    sections.push(generateTable(table))
  }

  if (options.refs) {
    for (const ref of options.refs) {
      sections.push(generateRef(ref))
    }
  }

  return sections.join('\n\n')
}

// ============================================================================
// Public API
// ============================================================================

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
