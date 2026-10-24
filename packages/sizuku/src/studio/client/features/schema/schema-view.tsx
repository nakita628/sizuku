import { Button, Chip, Tooltip, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import type { editor as MonacoEditor } from "monaco-editor/editor/editor.api.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuDownload, LuSave, LuSparkles } from "react-icons/lu";
import { SplitPane } from "../../components/split-pane.js";
import {
  getSchemaQueryKey,
  useFormatSettings,
  useLanguage,
  usePostDiagramPng,
  usePostDiagramSvg,
  usePostFormat,
  usePostLanguageDiagnostics,
  usePutSchema,
  useSchema,
} from "../../hooks/index.js";
import { problemMessage } from "../../lib/problem.js";
import { FORMAT_DEFAULTS } from "../../lib/settings.js";
import { useUiStore } from "../../lib/store.js";
import { CodeEditor } from "../editor/code-editor.js";
import { setLanguageEnabled, setTypeMarkers } from "../editor/language.js";
import { bindFormatter, setParseMarker } from "../editor/monaco.js";
import { DiagramPane } from "./diagram-pane.js";

type ParseError = { readonly message: string; readonly line: number; readonly column: number };

const DRAW_DEBOUNCE_MS = 250;
const CHECK_DEBOUNCE_MS = 500;
const AUTO_SAVE_MS = 1000;

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The schema file in Monaco on the left and its ER diagram on the right, redrawn as you type.
 * The editor holds the text; `base` is the text on disk as far as the page knows. A change on
 * disk replaces a clean editor and waits behind a banner when there is unsaved work.
 */
export function SchemaView() {
  const queryClient = useQueryClient();
  const snapshot = useSchema().data ?? null;
  const formatSettings = useFormatSettings().data ?? null;
  const theme = useUiStore((s) => s.theme);
  const editorSettings = useUiStore((s) => s.editor);
  const draw = usePostDiagramSvg();
  const drawPng = usePostDiagramPng();
  const format = usePostFormat();
  const put = usePutSchema();
  const language = useLanguage().data ?? null;
  const check = usePostLanguageDiagnostics();
  const typesOn = language?.typescript != null;

  const [text, setText] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [onDisk, setOnDisk] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [parseError, setParseError] = useState<ParseError | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  // The editor mounts after the text arrives; the type check waits for it.
  const [editorReady, setEditorReady] = useState(false);
  const drawSeq = useRef(0);
  const saving = useRef(false);

  const dirty = text !== null && base !== null && text !== base;

  // The file on disk: taken when the editor is clean, held back when it is not.
  useEffect(() => {
    if (snapshot === null) return;
    if (base === null || text === null) {
      setText(snapshot.source);
      setBase(snapshot.source);
      return;
    }
    if (snapshot.source === base) return;
    if (text === base || text === snapshot.source) {
      setText(snapshot.source);
      setBase(snapshot.source);
      setOnDisk(null);
    } else {
      setOnDisk(snapshot.source);
    }
  }, [snapshot?.source]); // eslint-disable-line react-hooks/exhaustive-deps

  // The drawing follows the editor, unsaved text included; a stale answer is dropped.
  useEffect(() => {
    if (text === null) return;
    const seq = ++drawSeq.current;
    const timer = setTimeout(() => {
      draw.mutate(
        { json: { source: text, theme } },
        {
          onSuccess: (result) => {
            if (seq !== drawSeq.current) return;
            setParseError(result.parseError);
            if (result.svg !== null) setSvg(result.svg);
          },
        },
      );
    }, DRAW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model) setParseMarker(model, parseError);
  }, [parseError]);

  useEffect(() => {
    setLanguageEnabled(typesOn);
  }, [typesOn]);

  // Type errors once typing stops. While the text does not parse, the parser's error is the one
  // that matters, and TypeScript's would only repeat it.
  const checkSeq = useRef(0);
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!typesOn || text === null || !model) return;
    if (parseError !== null) {
      setTypeMarkers(model, []);
      return;
    }
    const seq = ++checkSeq.current;
    const timer = setTimeout(() => {
      check.mutate(
        { json: { source: text } },
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
  }, [text, typesOn, parseError, editorReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const runFormat = useCallback(
    async (source: string) => {
      try {
        return (await format.mutateAsync({ json: { source } })).source;
      } catch (error) {
        toast.danger(problemMessage(error));
        return null;
      }
    },
    [format],
  );

  useEffect(() => {
    bindFormatter(runFormat);
    return () => bindFormatter(null);
  }, [runFormat]);

  const formatDocument = useCallback(async () => {
    const editor = editorRef.current;
    await editor?.getAction("editor.action.formatDocument")?.run();
    // A button press takes the focus; give it back so typing (and Ctrl+S) go on in the editor.
    editor?.focus();
  }, []);

  const save = useCallback(async () => {
    const editor = editorRef.current;
    if (editor === null || saving.current) return;
    saving.current = true;
    try {
      if (useUiStore.getState().editor.formatOnSave) await formatDocument();
      const source = editor.getValue();
      const saved = await put.mutateAsync({ json: { source } });
      // The save is what the next change event will report; with it in the cache already, the
      // page does not mistake its own write for someone else's.
      queryClient.setQueryData(getSchemaQueryKey(), saved);
      setBase(saved.source);
      setOnDisk(null);
    } catch (error) {
      toast.danger(problemMessage(error));
    } finally {
      saving.current = false;
    }
  }, [formatDocument, put, queryClient]);

  // Ctrl/Cmd+S saves wherever the focus is; left to the browser it would save the page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [save]);

  // Auto save waits for a pause in typing, and for a schema that parses.
  useEffect(() => {
    if (!editorSettings.autoSave || !dirty || parseError !== null) return;
    const timer = setTimeout(() => void save(), AUTO_SAVE_MS);
    return () => clearTimeout(timer);
  }, [text, dirty, parseError, editorSettings.autoSave, save]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    globalThis.addEventListener("beforeunload", warn);
    return () => globalThis.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const exportPng = async () => {
    if (text === null) return;
    try {
      const { base64 } = await drawPng.mutateAsync({ json: { source: text, theme } });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      download("er.png", new Blob([bytes], { type: "image/png" }));
    } catch (error) {
      toast.danger(problemMessage(error));
    }
  };

  const tabSize = formatSettings?.options.tabWidth ?? FORMAT_DEFAULTS.tabWidth;
  const useTabs = formatSettings?.options.useTabs ?? FORMAT_DEFAULTS.useTabs;
  const status = parseError
    ? { label: `Line ${parseError.line}: syntax error`, color: "danger" as const }
    : put.isPending
      ? { label: "Saving…", color: "warning" as const }
      : dirty
        ? { label: "Unsaved", color: "warning" as const }
        : { label: "Saved", color: "success" as const };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <h1 className="font-mono text-ui font-semibold">{snapshot?.file ?? "…"}</h1>
        <Chip size="sm" color={status.color} variant="soft">
          {status.label}
        </Chip>
        {language === null ? null : (
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Chip size="sm" variant="soft" color={typesOn ? "accent" : "default"}>
                {typesOn ? `TS ${language.typescript}` : "No TypeScript"}
              </Chip>
            </Tooltip.Trigger>
            <Tooltip.Content className="max-w-96 text-meta">
              {typesOn
                ? "Completion, hovers, signatures and type errors from the project's TypeScript."
                : language.reason}
            </Tooltip.Content>
          </Tooltip>
        )}
        <span className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onPress={() => void formatDocument()}
          isDisabled={text === null}
        >
          <LuSparkles />
          Format
        </Button>
        <Button
          size="sm"
          variant="ghost"
          isDisabled={svg === null}
          onPress={() => svg && download("er.svg", new Blob([svg], { type: "image/svg+xml" }))}
        >
          <LuDownload />
          SVG
        </Button>
        <Button
          size="sm"
          variant="ghost"
          isDisabled={text === null || drawPng.isPending}
          onPress={() => void exportPng()}
        >
          <LuDownload />
          PNG
        </Button>
        <Button size="sm" onPress={() => void save()} isDisabled={!dirty || put.isPending}>
          <LuSave />
          Save
        </Button>
      </header>
      {onDisk !== null ? (
        <div className="flex items-center gap-3 border-b border-danger-line bg-danger-soft px-4 py-2 text-body">
          <span className="flex-1">The file changed on disk while you have unsaved edits.</span>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              setText(onDisk);
              setBase(onDisk);
              setOnDisk(null);
            }}
          >
            Load the file
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              setBase(onDisk);
              setOnDisk(null);
            }}
          >
            Keep my edits
          </Button>
        </div>
      ) : null}
      <SplitPane
        direction="row"
        storageKey="sizuku-studio:schema-split"
        defaultRatio={0.42}
        label="Resize the editor"
        first={
          <div className="min-h-0 min-w-0 bg-surface">
            {text === null ? null : (
              <CodeEditor
                path="schema.ts"
                language="typescript"
                value={text}
                tabSize={tabSize}
                insertSpaces={!useTabs}
                commands={[{ keys: "save", run: () => void save() }]}
                onChange={setText}
                onMount={(editor) => {
                  editorRef.current = editor;
                  setEditorReady(true);
                  const model = editor.getModel();
                  if (model) setParseMarker(model, parseError);
                }}
              />
            )}
          </div>
        }
        second={
          <DiagramPane
            svg={svg}
            placeholder={parseError ? "Fix the syntax error to draw the diagram." : "Drawing…"}
            overlay={
              parseError ? (
                <button
                  type="button"
                  className="absolute right-3 bottom-3 left-3 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-left font-mono text-code text-danger"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    const editor = editorRef.current;
                    if (editor === null) return;
                    editor.setPosition({ lineNumber: parseError.line, column: parseError.column });
                    editor.revealLineInCenter(parseError.line);
                    editor.focus();
                  }}
                >
                  Line {parseError.line}, column {parseError.column}: {parseError.message}
                  <span className="ml-2 font-sans text-meta text-muted">
                    (the last drawing is kept)
                  </span>
                </button>
              ) : null
            }
          />
        }
      />
    </div>
  );
}
