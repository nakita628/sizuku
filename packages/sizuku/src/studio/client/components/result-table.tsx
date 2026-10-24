import { CellText } from "./cell.js";

type Row = Readonly<Record<string, string | number | boolean | null>>;

/** The rows a statement returned, in the order of its columns. */
export function ResultTable({
  columns,
  rows,
}: {
  readonly columns: readonly string[];
  readonly rows: readonly Row[];
}) {
  if (columns.length === 0) return null;
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-max min-w-full border-collapse font-mono text-code">
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-r border-line px-3 py-1.5 text-left font-semibold text-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-accent-soft/40">
              {columns.map((column) => (
                <td
                  key={column}
                  className="max-w-96 truncate border-b border-r border-line px-3 py-1"
                >
                  <CellText value={row[column]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
