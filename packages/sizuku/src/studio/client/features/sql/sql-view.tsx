import { Button, Kbd } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LuPlay } from "react-icons/lu";
import { ResultTable } from "../../components/result-table.js";
import { SplitPane } from "../../components/split-pane.js";
import { getDbKey, useDb, usePostDbSql } from "../../hooks/index.js";
import { problemMessage } from "../../lib/problem.js";
import { loadString, saveString } from "../../lib/storage.js";
import { CodeEditor } from "../editor/code-editor.js";

const SQL_KEY = "sizuku-studio:sql";

function initialSql(firstTable: string | null) {
  const stored = loadString(SQL_KEY);
  if (stored !== null && stored.trim() !== "") return stored;
  return firstTable === null ? "SELECT 1;" : `SELECT * FROM ${firstTable} LIMIT 50;`;
}

/** A SQL console on the connected database: one statement at a time, Ctrl/Cmd+Enter to run it. */
export function SqlView() {
  const queryClient = useQueryClient();
  const db = useDb().data ?? null;
  const run = usePostDbSql();
  const [sql, setSql] = useState<string | null>(null);
  const text = sql ?? (db === null ? null : initialSql(db.tables[0]?.table ?? null));

  const execute = () => {
    if (text === null || text.trim() === "") return;
    run.mutate(
      { json: { sql: text } },
      {
        // A write changes counts and rows the other pages show.
        onSuccess: (result) => {
          if (result.columns.length === 0)
            void queryClient.invalidateQueries({ queryKey: getDbKey() });
        },
      },
    );
  };

  if (db === null || text === null) return <div className="p-6 text-muted">Loading…</div>;

  const result = run.data ?? null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3.5 border-b border-line bg-surface px-6 py-3">
        <h1 className="page-title">SQL</h1>
        <span className="min-w-0 text-lead [overflow-wrap:anywhere] text-muted">
          {db.connected ? `${db.dialect} · ${db.url}` : "No database connected"}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-code text-faint">
          <Kbd>⌘/Ctrl</Kbd>
          <Kbd>Enter</Kbd>
          to run
        </span>
        <Button size="sm" onPress={execute} isDisabled={!db.connected || run.isPending}>
          <LuPlay />
          Run
        </Button>
      </header>
      <SplitPane
        direction="column"
        storageKey="sizuku-studio:sql-split"
        defaultRatio={0.4}
        label="Resize the SQL editor"
        first={
          <div className="min-h-0 bg-surface">
            <CodeEditor
              path="console.sql"
              language="sql"
              value={text}
              commands={[{ keys: "run", run: execute }]}
              onChange={(next) => {
                setSql(next);
                saveString(SQL_KEY, next);
              }}
            />
          </div>
        }
        second={
          <div className="flex min-h-0 flex-col bg-surface">
            <div className="flex items-center gap-3 border-b border-line px-4 py-1.5 text-meta text-muted">
              {run.isPending ? "Running…" : null}
              {result !== null && !run.isPending ? (
                <span className="tabular-nums">
                  {result.columns.length > 0
                    ? `${result.rowCount} rows`
                    : `${result.rowCount} rows changed`}{" "}
                  · {result.durationMs} ms
                </span>
              ) : null}
              {!db.connected ? "Start the studio with --url to run SQL." : null}
            </div>
            {run.error ? (
              <p className="m-4 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 font-mono text-code whitespace-pre-wrap text-danger">
                {problemMessage(run.error)}
              </p>
            ) : null}
            {result !== null && !run.error ? (
              <ResultTable columns={result.columns} rows={result.rows} />
            ) : null}
          </div>
        }
      />
    </div>
  );
}
