import { extractRelationsFromSchema, parseTableInfo } from "../helper/index.js";

export function dbml(code: string[]) {
  const TYPE_MAP: { readonly [k: string]: string } = {
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
  const tables = parseTableInfo(code);
  const relations = extractRelationsFromSchema(code);

  const tableSections = tables.map((table) => {
    const columns = table.fields.map((field) => {
      const type = TYPE_MAP[field.type] ?? field.type;
      const constraints = [
        field.keyType === "PK" ? "pk" : null,
        field.type.includes("serial") ? "increment" : null,
        field.description ? `note: '${field.description.replace(/'/g, "\\'")}'` : null,
      ].filter((c): c is string => c !== null);
      const constraintStr = constraints.length > 0 ? ` [${constraints.join(", ")}]` : "";
      return `  ${field.name} ${type}${constraintStr}`;
    });
    return [`Table ${table.name} {`, ...columns, "}"].join("\n");
  });

  const refSections = relations.map((r) => {
    // Original toDBMLRef inverts from/to: child table is "from" side in DBML
    const fromTable = r.toModel;
    const fromColumn = r.toField;
    const toTable = r.fromModel;
    const toColumn = r.fromField;
    const name = `${fromTable}_${fromColumn}_${toTable}_${toColumn}_fk`;
    return `Ref ${name}: ${fromTable}.${fromColumn} > ${toTable}.${toColumn}`;
  });

  return [...tableSections, ...refSections].join("\n\n");
}
