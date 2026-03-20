/**
 * Runtime types for extracting schema information from Drizzle ORM
 */

export type DrizzleDialect = "pg" | "mysql" | "sqlite";

export type RuntimeColumnInfo = {
  readonly name: string;
  readonly sqlType: string;
  readonly isPrimaryKey: boolean;
  readonly isNotNull: boolean;
  readonly isUnique: boolean;
  readonly hasDefault: boolean;
  readonly defaultValue?: unknown;
  readonly isAutoIncrement?: boolean;
};

export type RuntimeForeignKey = {
  readonly sourceTable: string;
  readonly sourceColumns: string[];
  readonly foreignTable: string;
  readonly foreignColumns: string[];
  readonly onDelete?: string;
  readonly onUpdate?: string;
};

export type RuntimeTableInfo = {
  readonly name: string;
  readonly tableName: string;
  readonly schema?: string;
  readonly dialect: DrizzleDialect;
  readonly columns: RuntimeColumnInfo[];
  readonly foreignKeys: RuntimeForeignKey[];
  readonly primaryKeyColumns?: string[];
};

export type RuntimeRelationInfo = {
  readonly type: "one" | "many";
  readonly sourceTable: string;
  readonly referencedTable: string;
  readonly sourceColumns?: string[];
  readonly foreignColumns?: string[];
  readonly relationName?: string;
};

export type RuntimeEnumInfo = {
  readonly name: string;
  readonly values: string[];
};

export type RuntimeSchemaInfo = {
  readonly dialect: DrizzleDialect;
  readonly tables: RuntimeTableInfo[];
  readonly relations: RuntimeRelationInfo[];
  readonly enums: RuntimeEnumInfo[];
};

export type CommentAnnotation = {
  readonly type: "zod" | "valibot" | "arktype" | "effect" | "description" | "relation" | "custom";
  readonly key: string;
  readonly value: string;
};

export type ColumnCommentMap = Map<string, CommentAnnotation[]>;

export type TableCommentMap = Map<string, CommentAnnotation[]>;

export type CommentInfo = {
  readonly tableComments: TableCommentMap;
  readonly columnComments: ColumnCommentMap;
};

export type MergedColumnInfo = RuntimeColumnInfo & {
  readonly annotations: CommentAnnotation[];
};

export type MergedTableInfo = Omit<RuntimeTableInfo, "columns"> & {
  readonly columns: MergedColumnInfo[];
  readonly annotations: CommentAnnotation[];
};

export type MergedRelationInfo = RuntimeRelationInfo & {
  readonly annotations?: CommentAnnotation[];
};

export type MergedSchema = {
  readonly dialect: DrizzleDialect;
  readonly tables: MergedTableInfo[];
  readonly relations: MergedRelationInfo[];
  readonly enums: RuntimeEnumInfo[];
};
