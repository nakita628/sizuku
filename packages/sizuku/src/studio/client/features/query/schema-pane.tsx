import { useEffect, useMemo, useRef, useState } from "react";
import { usePostDrizzleTouched } from "../../hooks/index.js";
import { SchemaCanvas } from "../diagram/canvas.js";
import { useSavedDiagram } from "../diagram/saved-diagram.js";
import type { SchemaHighlight } from "../diagram/types.js";

const TOUCHED_DEBOUNCE_MS = 300;

/**
 * The saved schema's diagram beside the query: the tables the query touches light up as it is
 * typed, with the columns it names marked, and the rest step back.
 */
export function QuerySchemaPane({ code }: { readonly code: string }) {
  const { snapshot, schema } = useSavedDiagram();
  const analyze = usePostDrizzleTouched();
  const [tables, setTables] = useState<
    readonly {
      readonly table: string;
      readonly columns: readonly string[];
    }[]
  >([]);

  const source = snapshot?.source ?? null;

  // A stale answer is dropped, so a slow one never paints over what is typed now.
  const seq = useRef(0);
  useEffect(() => {
    const current = ++seq.current;
    if (code.trim() === "") {
      setTables([]);
      return;
    }
    const timer = setTimeout(() => {
      analyze.mutate(
        { json: { code } },
        { onSuccess: (result) => current === seq.current && setTables(result.tables) },
      );
    }, TOUCHED_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const touched = useMemo<SchemaHighlight | null>(
    () =>
      tables.length === 0
        ? null
        : new Map(tables.map(({ table, columns }) => [table, new Set(columns)])),
    [tables],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-meta text-muted">
        <span className="font-semibold tracking-wide uppercase">Schema</span>
        <span className="truncate">
          {touched === null
            ? "The tables the query touches light up as you type."
            : `${touched.size} ${touched.size === 1 ? "table" : "tables"} touched · the columns it names are marked`}
        </span>
      </div>
      {schema === null || snapshot === null ? (
        <div className="diagram-canvas flex flex-1 items-center justify-center text-body text-muted">
          {snapshot?.parseError ? "The saved schema does not parse." : "Drawing…"}
        </div>
      ) : (
        <SchemaCanvas schema={schema} schemaPath={snapshot.file} touched={touched} compact />
      )}
    </div>
  );
}
