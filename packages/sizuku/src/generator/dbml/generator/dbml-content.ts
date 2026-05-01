type DBMLColumn = {
  readonly name: string;
  readonly type: string;
  readonly isPrimaryKey?: boolean;
  readonly isUnique?: boolean;
  readonly isNotNull?: boolean;
  readonly isIncrement?: boolean;
  readonly defaultValue?: string;
  readonly note?: string;
};

type DBMLTable = {
  readonly name: string;
  readonly columns: readonly DBMLColumn[];
  readonly note?: string;
};

// type: '>' many-to-one, '<' one-to-many, '-' one-to-one
type DBMLRef = {
  readonly name?: string;
  readonly fromTable: string;
  readonly fromColumn: string;
  readonly toTable: string;
  readonly toColumn: string;
  readonly type?: ">" | "<" | "-";
  readonly onDelete?: string;
  readonly onUpdate?: string;
};

type DBMLEnum = {
  readonly name: string;
  readonly values: readonly string[];
};

type DBMLContentOptions = {
  readonly tables: readonly DBMLTable[];
  readonly enums?: readonly DBMLEnum[];
  readonly refs?: readonly DBMLRef[];
};

type FieldInfo = {
  readonly name: string;
  readonly type: string;
  readonly keyType: "PK" | "FK" | null;
  readonly description: string | null;
};

type TableInfo = {
  readonly name: string;
  readonly fields: readonly FieldInfo[];
};

type RelationInfo = {
  readonly fromModel: string;
  readonly toModel: string;
  readonly fromField: string;
  readonly toField: string;
  readonly isRequired: boolean;
};

export function mapDrizzleType(drizzleType: string) {
  const typeMap: Record<string, string> = {
    serial: "serial",
    smallserial: "smallserial",
    bigserial: "bigserial",
    integer: "integer",
    int: "integer",
    smallint: "smallint",
    bigint: "bigint",
    boolean: "boolean",
    text: "text",
    varchar: "varchar",
    char: "char",
    numeric: "numeric",
    decimal: "decimal",
    real: "real",
    doublePrecision: "double precision",
    json: "json",
    jsonb: "jsonb",
    timestamp: "timestamp",
    timestamptz: "timestamptz",
    date: "date",
    time: "time",
    interval: "interval",
    uuid: "uuid",
    blob: "blob",
    bytea: "bytea",
  };

  return typeMap[drizzleType] ?? drizzleType;
}

export function escapeNote(str: string) {
  return str.replace(/'/g, "\\'");
}

function quote(value: string) {
  return `'${escapeNote(value)}'`;
}

export function makeColumnConstraints(column: DBMLColumn) {
  return [
    column.isPrimaryKey ? "pk" : null,
    column.isIncrement ? "increment" : null,
    column.isUnique ? "unique" : null,
    column.isNotNull && !column.isPrimaryKey ? "not null" : null,
    column.defaultValue !== undefined ? `default: ${column.defaultValue}` : null,
    column.note ? `note: ${quote(column.note)}` : null,
  ].filter((c): c is string => c !== null);
}

export function formatConstraints(constraints: readonly string[]) {
  return constraints.length > 0 ? ` [${constraints.join(", ")}]` : "";
}

export function makeColumn(column: DBMLColumn) {
  const constraints = makeColumnConstraints(column);
  return `  ${column.name} ${column.type}${formatConstraints(constraints)}`;
}

export function makeTable(table: DBMLTable) {
  const columnLines = table.columns.map(makeColumn);
  const noteLines = table.note ? ["", `  Note: ${quote(table.note)}`] : [];
  return [`Table ${table.name} {`, ...columnLines, ...noteLines, "}"].join("\n");
}

export function makeEnum(enumDef: DBMLEnum) {
  return [`Enum ${enumDef.name} {`, ...enumDef.values.map((v) => `  ${v}`), "}"].join("\n");
}

export function makeRefName(ref: DBMLRef) {
  return ref.name ?? `${ref.fromTable}_${ref.fromColumn}_${ref.toTable}_${ref.toColumn}_fk`;
}

export function makeRef(ref: DBMLRef) {
  const name = makeRefName(ref);
  const operator = ref.type ?? ">";
  const actions = [
    ref.onDelete ? `delete: ${ref.onDelete}` : null,
    ref.onUpdate ? `update: ${ref.onUpdate}` : null,
  ].filter((a): a is string => a !== null);
  const actionStr = actions.length > 0 ? ` [${actions.join(", ")}]` : "";

  return `Ref ${name}: ${ref.fromTable}.${ref.fromColumn} ${operator} ${ref.toTable}.${ref.toColumn}${actionStr}`;
}

function makeDBMLContent(options: DBMLContentOptions) {
  const enumSections = options.enums ? options.enums.map(makeEnum) : [];
  const tableSections = options.tables.map(makeTable);
  const refSections = options.refs ? options.refs.map(makeRef) : [];
  return [...enumSections, ...tableSections, ...refSections].join("\n\n");
}

function toDBMLColumn(field: FieldInfo) {
  return {
    name: field.name,
    type: mapDrizzleType(field.type),
    isPrimaryKey: field.keyType === "PK",
    isIncrement: field.type.includes("serial"),
    note: field.description ?? undefined,
  };
}

function toDBMLTable(table: TableInfo) {
  return {
    name: table.name,
    columns: table.fields.map(toDBMLColumn),
  };
}

function toDBMLRef(relation: RelationInfo) {
  return {
    fromTable: relation.toModel,
    fromColumn: relation.toField,
    toTable: relation.fromModel,
    toColumn: relation.fromField,
  };
}

export function dbmlContent(relations: readonly RelationInfo[], tables: readonly TableInfo[]) {
  return makeDBMLContent({
    tables: tables.map(toDBMLTable),
    refs: relations.map(toDBMLRef),
  });
}
