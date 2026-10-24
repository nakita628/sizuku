import { Button, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuTrash2,
} from "react-icons/lu";
import { CellText } from "../../components/cell.js";
import { ConfirmDialog } from "../../components/confirm-dialog.js";
import {
  getDbKey,
  useDb,
  useDbRowsTableName,
  useDeleteDbRowsTableName,
  usePatchDbRowsTableName,
  usePostDbRowsTableName,
} from "../../hooks/index.js";
import { problemMessage } from "../../lib/problem.js";
import { RowDialog } from "./row-dialog.js";

type Cell = string | number | boolean | null;
type Row = Readonly<Record<string, Cell>>;

const PAGE_SIZE = 50;

function keyOf(row: Row, key: readonly string[]) {
  return Object.fromEntries(key.map((name) => [name, row[name] ?? null]));
}

function NotConnected({ error }: { readonly error: string | null }) {
  return (
    <div className="m-6 max-w-2xl rounded-xl border border-line bg-surface p-5 text-body">
      <h2 className="mb-2 text-ui font-semibold">No database connected</h2>
      {error ? <p className="mb-2 font-mono text-code text-danger">{error}</p> : null}
      <p className="text-muted">Start the studio with a database to browse and edit rows:</p>
      <pre className="mt-2 rounded-lg bg-surface-2 p-3 font-mono text-code">
        {
          "sizuku studio db/schema.ts --url file:./dev.db\nsizuku studio db/schema.ts --url postgres://user:pass@localhost:5432/app\nsizuku studio db/schema.ts --url mysql://user:pass@localhost:3306/app"
        }
      </pre>
      <p className="mt-2 text-meta text-muted">
        PostgreSQL and MySQL use the <code>pg</code> and <code>mysql2</code> packages of your
        project. DATABASE_URL works too.
      </p>
    </div>
  );
}

/** One table's rows, a page at a time, with adding, changing and deleting a row. */
export function TableView({ tableName }: { readonly tableName: string }) {
  const queryClient = useQueryClient();
  const db = useDb().data ?? null;
  const table = db?.tables.find((t) => t.name === tableName) ?? null;
  const [skip, setSkip] = useState(0);
  const [editing, setEditing] = useState<{ readonly row: Row | null } | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const rows = useDbRowsTableName(
    { param: { tableName }, query: { skip: String(skip), take: String(PAGE_SIZE) } },
    { query: { enabled: db?.connected === true && table !== null, retry: false } },
  );
  const insert = usePostDbRowsTableName();
  const update = usePatchDbRowsTableName();
  const remove = useDeleteDbRowsTableName();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getDbKey() });
  const done = (message: string) => () => {
    toast.success(message);
    setEditing(null);
    setDeleting(null);
    void refresh();
  };
  const failed = (error: unknown) => toast.danger(problemMessage(error));

  if (db === null) return <div className="p-6 text-muted">Loading…</div>;
  if (table === null) {
    return (
      <div className="p-6 text-body">
        No table named <code className="font-mono">{tableName}</code> in the schema.{" "}
        <Link to="/" className="text-accent-text underline">
          Back to the schema
        </Link>
      </div>
    );
  }
  if (!db.connected) return <NotConnected error={db.error} />;

  const page = rows.data ?? null;
  const total = page?.total ?? 0;
  const columns = table.columns.map((c) => c.name);
  const extra = Object.keys(page?.rows[0] ?? {}).filter((name) => !columns.includes(name));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <h1 className="font-mono text-ui font-semibold">{table.name}</h1>
        {table.table !== table.name ? (
          <span className="font-mono text-meta text-muted">{table.table}</span>
        ) : null}
        <span className="text-meta text-muted tabular-nums">{total} rows</span>
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onPress={() => void refresh()}>
          <LuRefreshCw />
          Refresh
        </Button>
        <Button size="sm" onPress={() => setEditing({ row: null })}>
          <LuPlus />
          Add row
        </Button>
      </header>
      {rows.error ? (
        <p className="m-4 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 font-mono text-code text-danger">
          {problemMessage(rows.error)}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse font-mono text-code">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              <th className="w-16 border-r border-b border-line" />
              {table.columns.map((column) => (
                <th
                  key={column.name}
                  className="border-r border-b border-line px-3 py-1.5 text-left"
                >
                  <div className="font-semibold">{column.name}</div>
                  <div className="font-normal text-meta text-faint">
                    {column.type}
                    {column.nullable ? "?" : ""}
                    {table.key.includes(column.name) ? " · key" : ""}
                  </div>
                </th>
              ))}
              {extra.map((name) => (
                <th
                  key={name}
                  className="border-r border-b border-line px-3 py-1.5 text-left text-faint"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(page?.rows ?? []).map((row, index) => (
              <tr key={index} className="group hover:bg-accent-soft/40">
                <td className="border-r border-b border-line px-1">
                  <div className="flex gap-0.5 opacity-40 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      isIconOnly
                      size="sm"
                      aria-label="Edit row"
                      onPress={() => setEditing({ row })}
                    >
                      <LuPencil />
                    </Button>
                    <Button
                      variant="ghost"
                      isIconOnly
                      size="sm"
                      aria-label="Delete row"
                      onPress={() => setDeleting(row)}
                    >
                      <LuTrash2 />
                    </Button>
                  </div>
                </td>
                {[...columns, ...extra].map((name) => (
                  <td
                    key={name}
                    className="max-w-80 cursor-pointer truncate border-r border-b border-line px-3 py-1"
                    onDoubleClick={() => setEditing({ row })}
                  >
                    <CellText value={row[name]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {page !== null && page.rows.length === 0 ? (
          <p className="p-6 text-body text-muted">No rows yet.</p>
        ) : null}
      </div>
      <footer className="flex items-center gap-2 border-t border-line bg-surface px-4 py-1.5 text-meta text-muted">
        <span className="tabular-nums">
          {total === 0 ? 0 : skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
        </span>
        <span className="flex-1" />
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          aria-label="Previous page"
          isDisabled={skip === 0}
          onPress={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
        >
          <LuChevronLeft />
        </Button>
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          aria-label="Next page"
          isDisabled={skip + PAGE_SIZE >= total}
          onPress={() => setSkip(skip + PAGE_SIZE)}
        >
          <LuChevronRight />
        </Button>
      </footer>
      <RowDialog
        isOpen={editing !== null}
        title={editing?.row ? `Edit ${table.name} row` : `Add a ${table.name} row`}
        columns={table.columns}
        row={editing?.row ?? null}
        isPending={insert.isPending || update.isPending}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={(values) => {
          const row = editing?.row ?? null;
          if (row === null) {
            insert.mutate(
              { param: { tableName }, json: { values } },
              { onSuccess: done("Row added"), onError: failed },
            );
          } else if (Object.keys(values).length === 0) {
            setEditing(null);
          } else {
            update.mutate(
              { param: { tableName }, json: { where: keyOf(row, table.key), values } },
              { onSuccess: done("Row saved"), onError: failed },
            );
          }
        }}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        title={`Delete this ${table.name} row?`}
        detail={
          <code className="font-mono text-code">
            {Object.entries(deleting ? keyOf(deleting, table.key) : {})
              .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
              .join(", ")}
          </code>
        }
        confirmLabel="Delete"
        isPending={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => {
          if (deleting === null) return;
          remove.mutate(
            { param: { tableName }, json: { where: keyOf(deleting, table.key) } },
            { onSuccess: done("Row deleted"), onError: failed },
          );
        }}
      />
    </div>
  );
}
