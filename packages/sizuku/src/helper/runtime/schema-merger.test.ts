import { describe, expect, it } from 'vitest'
import {
  createMergedSchemaFromRuntime,
  findColumn,
  findTable,
  getForeignKeysTo,
  getTableRelations,
  mergeSchemaWithComments,
} from './schema-merger.js'
import type {
  CommentInfo,
  MergedSchema,
  RuntimeSchemaInfo,
} from './types.js'

function createUserRuntimeInfo(): RuntimeSchemaInfo {
  return {
    dialect: 'pg',
    tables: [
      {
        name: 'user',
        tableName: 'user',
        dialect: 'pg',
        columns: [
          { name: 'id', sqlType: 'uuid', isPrimaryKey: true, isNotNull: true, isUnique: false, hasDefault: true },
          { name: 'name', sqlType: 'varchar', isPrimaryKey: false, isNotNull: true, isUnique: false, hasDefault: false },
        ],
        foreignKeys: [],
      },
    ],
    relations: [],
    enums: [],
  }
}

function createUserPostRuntimeInfo(): RuntimeSchemaInfo {
  return {
    dialect: 'pg',
    tables: [
      {
        name: 'user',
        tableName: 'user',
        dialect: 'pg',
        columns: [
          { name: 'id', sqlType: 'uuid', isPrimaryKey: true, isNotNull: true, isUnique: false, hasDefault: true },
          { name: 'name', sqlType: 'varchar', isPrimaryKey: false, isNotNull: true, isUnique: false, hasDefault: false },
        ],
        foreignKeys: [],
      },
      {
        name: 'post',
        tableName: 'post',
        dialect: 'pg',
        columns: [
          { name: 'id', sqlType: 'uuid', isPrimaryKey: true, isNotNull: true, isUnique: false, hasDefault: true },
          { name: 'title', sqlType: 'varchar', isPrimaryKey: false, isNotNull: true, isUnique: false, hasDefault: false },
          { name: 'userId', sqlType: 'uuid', isPrimaryKey: false, isNotNull: true, isUnique: false, hasDefault: false },
        ],
        foreignKeys: [
          {
            sourceTable: 'post',
            sourceColumns: ['userId'],
            foreignTable: 'user',
            foreignColumns: ['id'],
          },
        ],
      },
    ],
    relations: [
      {
        type: 'many',
        sourceTable: 'user',
        referencedTable: 'post',
      },
      {
        type: 'one',
        sourceTable: 'post',
        referencedTable: 'user',
        sourceColumns: ['userId'],
        foreignColumns: ['id'],
      },
    ],
    enums: [],
  }
}

describe('createMergedSchemaFromRuntime', () => {
  it('creates merged schema with empty annotations', () => {
    const runtimeInfo = createUserRuntimeInfo()
    const result = createMergedSchemaFromRuntime(runtimeInfo)

    expect(result.dialect).toBe('pg')
    expect(result.tables.length).toBe(1)
    expect(result.tables[0].tableName).toBe('user')
    expect(result.tables[0].annotations).toStrictEqual([])
    expect(result.tables[0].columns.length).toBe(2)
    expect(result.tables[0].columns[0].name).toBe('id')
    expect(result.tables[0].columns[0].annotations).toStrictEqual([])
    expect(result.tables[0].columns[1].name).toBe('name')
    expect(result.tables[0].columns[1].annotations).toStrictEqual([])
    expect(result.relations).toStrictEqual([])
    expect(result.enums).toStrictEqual([])
  })
})

describe('mergeSchemaWithComments', () => {
  it('merges annotations onto correct columns and tables', () => {
    const runtimeInfo = createUserRuntimeInfo()
    const comments: CommentInfo = {
      tableComments: new Map([
        ['user', [{ type: 'zod', key: 'schema', value: 'strictObject' }]],
      ]),
      columnComments: new Map([
        ['user.id', [{ type: 'zod', key: 'schema', value: 'uuid()' }]],
        ['user.name', [
          { type: 'zod', key: 'schema', value: 'string().min(1)' },
          { type: 'valibot', key: 'schema', value: 'pipe(v.string(), v.minLength(1))' },
        ]],
      ]),
    }

    const result = mergeSchemaWithComments(runtimeInfo, comments)

    expect(result.tables[0].annotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'strictObject' },
    ])
    expect(result.tables[0].columns[0].annotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'uuid()' },
    ])
    expect(result.tables[0].columns[1].annotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'string().min(1)' },
      { type: 'valibot', key: 'schema', value: 'pipe(v.string(), v.minLength(1))' },
    ])
  })
})

describe('findTable', () => {
  it('finds existing table by name', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const userTable = findTable(schema, 'user')
    expect(userTable).not.toBe(undefined)
    expect(userTable!.tableName).toBe('user')
  })

  it('returns undefined for nonexistent table', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const result = findTable(schema, 'nonexistent')
    expect(result).toBe(undefined)
  })
})

describe('findColumn', () => {
  it('finds existing column by table and column name', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const idColumn = findColumn(schema, 'user', 'id')
    expect(idColumn).not.toBe(undefined)
    expect(idColumn!.name).toBe('id')
    expect(idColumn!.sqlType).toBe('uuid')
    expect(idColumn!.isPrimaryKey).toBe(true)
  })

  it('returns undefined for nonexistent column', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const result = findColumn(schema, 'user', 'nonexistent')
    expect(result).toBe(undefined)
  })

  it('returns undefined for nonexistent table', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const result = findColumn(schema, 'nonexistent', 'id')
    expect(result).toBe(undefined)
  })
})

describe('getTableRelations', () => {
  it('returns relations where sourceTable matches', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const postRelations = getTableRelations(schema, 'post')
    expect(postRelations.length).toBe(1)
    expect(postRelations[0].sourceTable).toBe('post')
    expect(postRelations[0].referencedTable).toBe('user')
    expect(postRelations[0].type).toBe('one')
  })

  it('returns empty array for table with no relations', () => {
    const runtimeInfo = createUserRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const result = getTableRelations(schema, 'user')
    expect(result).toStrictEqual([])
  })
})

describe('getForeignKeysTo', () => {
  it('returns foreign keys targeting the specified table', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const fks = getForeignKeysTo(schema, 'user')
    expect(fks.length).toBe(1)
    expect(fks[0].sourceTable).toBe('post')
    expect(fks[0].fk.foreignTable).toBe('user')
    expect(fks[0].fk.sourceColumns).toStrictEqual(['userId'])
    expect(fks[0].fk.foreignColumns).toStrictEqual(['id'])
  })

  it('returns empty array when no foreign keys target the table', () => {
    const runtimeInfo = createUserPostRuntimeInfo()
    const schema = createMergedSchemaFromRuntime(runtimeInfo)

    const result = getForeignKeysTo(schema, 'post')
    expect(result).toStrictEqual([])
  })
})
