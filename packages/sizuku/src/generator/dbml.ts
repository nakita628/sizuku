import { mergeRelations, parseTableInfo } from "../helper/index.js";

const isMany = (c: string) => c === "many" || c === "zero-many";

// DBML has four relationship operators and no notion of zero/optional, so a
// cardinality pair collapses to one of them. The DBML line reads
// `child OP parent`, i.e. left = `to` (child), right = `from` (parent).
// https://dbml.dbdiagram.io/docs/#relationships--foreign-key-definitions
function dbmlOperator(leftMany: boolean, rightMany: boolean) {
  if (leftMany && !rightMany) return ">";
  if (!leftMany && rightMany) return "<";
  if (leftMany && rightMany) return "<>";
  return "-";
}

// Reconstructs the original `/// @relation` cardinality string for the logical
// comment, so the optional/zero information dropped by the DBML operator is not
// silently lost.
function annotationSource(r: {
  readonly from: { readonly cardinality: string };
  readonly to: { readonly cardinality: string };
  readonly identifying: boolean;
}) {
  return `${r.from.cardinality}-to-${r.to.cardinality}${r.identifying ? "" : "-optional"}`;
}

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
  const relations = mergeRelations(code);

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
    // DBML puts the child (FK) table on the left: left = `to`, right = `from`.
    const left = `${r.to.model}.${r.to.field}`;
    const right = `${r.from.model}.${r.from.field}`;
    const op = dbmlOperator(isMany(r.to.cardinality), isMany(r.from.cardinality));
    // Physical FKs keep the `_fk` suffix. Logical (annotated) relations drop it
    // and carry a `//` comment, since `note:` is not a valid Ref setting and the
    // relation is not a DB-enforced constraint.
    const suffix = r.origin === "inferred" ? "_fk" : "";
    const name = `${r.to.model}_${r.to.field}_${r.from.model}_${r.from.field}${suffix}`;
    const refLine = `Ref ${name}: ${left} ${op} ${right}`;
    return r.origin === "annotated"
      ? `// logical relation (src: ${annotationSource(r)})\n${refLine}`
      : refLine;
  });

  return [...tableSections, ...refSections].join("\n\n");
}
