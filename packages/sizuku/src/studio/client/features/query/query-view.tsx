import { Button, Tabs } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import type { editor as MonacoEditor } from "monaco-editor/editor/editor.api.js";
import { useEffect, useRef, useState } from "react";
import { LuPlay } from "react-icons/lu";
import { SplitPane } from "../../components/split-pane.js";
import {
  getDbKey,
  useDb,
  useLanguage,
  usePostLanguageDiagnostics,
  usePostDrizzle,
} from "../../hooks/index.js";
import { problemMessage } from "../../lib/problem.js";
import { loadString, saveString } from "../../lib/storage.js";
import { CodeEditor } from "../editor/code-editor.js";
import { QUERY_MODEL, setLanguageEnabled, setTypeMarkers } from "../editor/language.js";
import { asRows, ResultView } from "./result-view.js";

const CODE_KEY = "sizuku-studio:query";
const CHECK_DEBOUNCE_MS = 500;

function initialCode(firstTable: string | null) {
  const stored = loadString(CODE_KEY);
  if (stored !== null && stored.trim() !== "") return stored;
  return [
    "// `db` is Drizzle over the connected database, with the schema. The schema's tables and",
    "// drizzle-orm's operators (eq, and, or, desc, sql, count, ...) are in scope.",
    "// The last expression is the result; Ctrl/Cmd + Enter runs it.",
    firstTable === null ? "db.run(sql`select 1`)" : `db.select().from(${firstTable}).limit(10)`,
    "",
  ].join("\n");
}

/**
 * Drizzle against the connected database: write a query with completion and type errors from
 * the project's TypeScript, run it, and see its value and the SQL it sent.
 */
export function QueryView() {
  const queryClient = useQueryClient();
  const db = useDb().data ?? null;
  const language = useLanguage().data ?? null;
  const typesOn = language?.typescript != null;
  const run = usePostDrizzle();
  const check = usePostLanguageDiagnostics();
  const [code, setCode] = useState<string | null>(null);
  const [tab, setTab] = useState<"result" | "json" | "sql">("result");
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const checkSeq = useRef(0);
  const text = code ?? (db === null ? null : initialCode(db.tables[0]?.name ?? null));

  useEffect(() => {
    setLanguageEnabled(typesOn);
  }, [typesOn]);

  // Type errors once typing stops, checked against the saved schema.
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!typesOn || text === null || !model) return;
    const seq = ++checkSeq.current;
    const timer = setTimeout(() => {
      check.mutate(
        { json: { source: text, document: "query" } },
        {
          onSuccess: (result) => {
            if (seq === checkSeq.current && !model.isDisposed()) {
              setTypeMarkers(model, result.diagnostics);
            }
          },
        },
      );
    }, CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, typesOn, editorReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const execute = () => {
    const current = editorRef.current?.getValue() ?? text;
    if (current === null || current.trim() === "") return;
    run.mutate(
      { json: { code: current } },
      {
        onSuccess: (result) => {
          setTab(
            result.error !== null ? "sql" : asRows(result.result) === null ? "json" : "result",
          );
          // A write changes the counts and rows the other pages show.
          if (result.statements.some((s) => !/^\s*(select|with)\b/iu.test(s.sql))) {
            void queryClient.invalidateQueries({ queryKey: getDbKey() });
          }
        },
      },
    );
  };

  if (db === null || text === null) return <div className="p-6 text-muted">Loading…</div>;
  const result = run.data ?? null;
  const unavailable = !db.connected
    ? "Start the studio with --url (or set DATABASE_URL) to run queries."
    : !typesOn && language !== null
      ? `Running a query needs the project's TypeScript: ${language.reason}`
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <h1 className="text-ui font-semibold">Query</h1>
        <span className="font-mono text-meta text-muted">
          {db.connected ? `Drizzle · ${db.dialect} · ${db.url}` : "no database"}
        </span>
        <span className="flex-1" />
        <span className="text-meta text-faint">Ctrl/Cmd + Enter</span>
        <Button size="sm" onPress={execute} isDisabled={unavailable !== null || run.isPending}>
          <LuPlay />
          Run
        </Button>
      </header>
      {unavailable ? (
        <p className="border-b border-line bg-surface-2 px-4 py-2 text-body text-muted">
          {unavailable}
        </p>
      ) : null}
      <SplitPane
        direction="row"
        storageKey="sizuku-studio:query-split"
        defaultRatio={0.45}
        label="Resize the query editor"
        first={
          <div className="min-h-0 min-w-0 bg-surface">
            <CodeEditor
              path={QUERY_MODEL}
              language="typescript"
              value={text}
              commands={[{ keys: "run", run: execute }]}
              onChange={(next) => {
                setCode(next);
                saveString(CODE_KEY, next);
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                setEditorReady(true);
              }}
            />
          </div>
        }
        second={
          <div className="flex min-h-0 min-w-0 flex-col bg-surface">
            <div className="flex items-center gap-3 border-b border-line px-3 py-1.5">
              <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as typeof tab)}>
                <Tabs.ListContainer className="w-fit">
                  <Tabs.List aria-label="Views of the result">
                    <Tabs.Tab id="result">Result</Tabs.Tab>
                    <Tabs.Tab id="json">JSON</Tabs.Tab>
                    <Tabs.Tab id="sql" className="whitespace-nowrap">
                      SQL{result ? ` (${result.statements.length})` : ""}
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
              <span className="flex-1" />
              <span className="text-meta text-muted tabular-nums">
                {run.isPending ? "Running…" : result ? `${result.durationMs} ms` : null}
              </span>
            </div>
            {run.error ? (
              <p className="m-4 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 font-mono text-code whitespace-pre-wrap text-danger">
                {problemMessage(run.error)}
              </p>
            ) : null}
            {result?.error ? (
              <p className="m-4 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 font-mono text-code whitespace-pre-wrap text-danger">
                {result.error}
              </p>
            ) : null}
            {result === null || run.error ? null : tab === "sql" ? (
              <ol className="min-h-0 flex-1 overflow-auto">
                {result.statements.map((statement, index) => (
                  <li key={index} className="border-b border-line px-4 py-2">
                    <pre className="font-mono text-code whitespace-pre-wrap">{statement.sql}</pre>
                    <div className="mt-1 flex flex-wrap gap-3 font-mono text-meta text-muted">
                      {statement.params.length > 0 ? (
                        <span>params {JSON.stringify(statement.params)}</span>
                      ) : null}
                      <span>{statement.rowCount} rows</span>
                      <span>{statement.durationMs} ms</span>
                    </div>
                  </li>
                ))}
                {result.statements.length === 0 ? (
                  <li className="px-4 py-3 text-body text-muted">No statement was sent.</li>
                ) : null}
              </ol>
            ) : result.error ? null : (
              <ResultView value={result.result} asJson={tab === "json"} />
            )}
          </div>
        }
      />
    </div>
  );
}
