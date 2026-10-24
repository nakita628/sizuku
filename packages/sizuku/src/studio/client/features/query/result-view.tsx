import { ResultTable } from "../../components/result-table.js";

type Cell = string | number | boolean | null;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cell(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return value;
  return JSON.stringify(value);
}

/** The rows of a result that is a list of objects, with every key any of them has; else null. */
export function asRows(value: unknown) {
  const list = Array.isArray(value) ? value : isRecord(value) ? [value] : null;
  if (list === null || list.length === 0 || !list.every(isRecord)) return null;
  const columns = [...new Set(list.flatMap((row) => Object.keys(row)))];
  return {
    columns,
    rows: list.map((row) =>
      Object.fromEntries(columns.map((column) => [column, cell(row[column])])),
    ),
  };
}

/** A query's value: a table when it is rows (one object counts as one row), JSON otherwise. */
export function ResultView({
  value,
  asJson,
}: {
  readonly value: unknown;
  readonly asJson: boolean;
}) {
  const table = asJson ? null : asRows(value);
  if (table !== null) return <ResultTable columns={table.columns} rows={table.rows} />;
  return (
    <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-code whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
