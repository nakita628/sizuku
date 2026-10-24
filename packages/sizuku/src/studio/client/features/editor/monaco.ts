// The Monaco build the studio ships: the editor core, the features the editors use, and the
// TypeScript and SQL tokenizers, bundled by Vite. Nothing is fetched from a CDN, so the studio
// works offline. Monaco's own TypeScript service is left out: the browser has no drizzle-orm
// types. Completion, hovers and type errors come from the project's TypeScript on the server
// (language.ts), the syntax errors from the server's parser, and Format Document from oxfmt.
import { loader } from "@monaco-editor/react";
import * as monacoApi from "monaco-editor/editor/editor.api.js";
import { editor, languages, MarkerSeverity } from "monaco-editor/editor/editor.api.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import "./monaco-features.js";
import { registerLanguage } from "./language.js";
import type { Theme } from "../../lib/store.js";

export const EDITOR_FONT =
  "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', 'Noto Sans Mono CJK JP', monospace";

export const BASE_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  // Monaco 0.56+ defaults its input to the experimental EditContext, through which Chromium
  // never inserts a space; the textarea this turns back on is the input Monaco used for a decade.
  editContext: false,
  fontFamily: EDITOR_FONT,
  fontSize: 13,
  lineHeight: 20,
  tabSize: 2,
  insertSpaces: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: "line",
  lineNumbersMinChars: 3,
  glyphMargin: false,
  folding: true,
  wordBasedSuggestions: "currentDocument",
  bracketPairColorization: { enabled: false },
  guides: { bracketPairs: false, indentation: true },
  stickyScroll: { enabled: false },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
  fixedOverflowWidgets: true,
  smoothScrolling: true,
  cursorBlinking: "smooth",
};

const PALETTE = {
  light: {
    surface: "#ffffff",
    ink: "#16181f",
    muted: "#6b7084",
    faint: "#9a9fb3",
    line: "#e4e6ee",
    lineStrong: "#cfd3e0",
    accent: "#4f46e5",
    accentSoft: "#eef0ff",
    keyword: "#7c3aed",
    string: "#0f766e",
    number: "#b45309",
    type: "#1d4ed8",
    comment: "#8a8fa3",
    docComment: "#0f766e",
  },
  dark: {
    surface: "#171a23",
    ink: "#e6e8ef",
    muted: "#9aa0b4",
    faint: "#6b7189",
    line: "#262b38",
    lineStrong: "#343a4a",
    accent: "#7c74ff",
    accentSoft: "#24264a",
    keyword: "#c4b5fd",
    string: "#5eead4",
    number: "#fcd34d",
    type: "#93c5fd",
    comment: "#6b7189",
    docComment: "#5eead4",
  },
} as const;

function themeData(theme: Theme): editor.IStandaloneThemeData {
  const c = PALETTE[theme];
  return {
    base: theme === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: c.keyword.slice(1) },
      { token: "type", foreground: c.type.slice(1) },
      { token: "type.identifier", foreground: c.type.slice(1) },
      { token: "string", foreground: c.string.slice(1) },
      { token: "number", foreground: c.number.slice(1) },
      { token: "comment", foreground: c.comment.slice(1), fontStyle: "italic" },
      { token: "comment.doc", foreground: c.docComment.slice(1), fontStyle: "italic" },
      { token: "identifier", foreground: c.ink.slice(1) },
      { token: "delimiter", foreground: c.muted.slice(1) },
      { token: "operator", foreground: c.muted.slice(1) },
      { token: "predefined.sql", foreground: c.type.slice(1) },
      { token: "operator.sql", foreground: c.keyword.slice(1) },
    ],
    colors: {
      "editor.background": c.surface,
      "editor.foreground": c.ink,
      "editorGutter.background": c.surface,
      "editorLineNumber.foreground": c.faint,
      "editorLineNumber.activeForeground": c.muted,
      "editor.lineHighlightBackground": `${c.accentSoft}99`,
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": c.accentSoft,
      "editor.inactiveSelectionBackground": `${c.accentSoft}99`,
      "editorCursor.foreground": c.accent,
      "editorIndentGuide.background1": c.line,
      "editorIndentGuide.activeBackground1": c.lineStrong,
      "editorWidget.background": c.surface,
      "editorWidget.border": c.lineStrong,
    },
  };
}

export function themeName(theme: Theme) {
  return theme === "dark" ? "sizuku-dark" : "sizuku-light";
}

// The formatter the schema editor's Format Document runs: set by the view, so it reads the
// options in effect when it runs rather than when the provider was registered.
const formatter: { run: ((source: string) => Promise<string | null>) | null } = { run: null };

export function bindFormatter(run: ((source: string) => Promise<string | null>) | null) {
  formatter.run = run;
}

const state = { ready: false };

export function setupMonaco() {
  if (state.ready) return monacoApi;
  state.ready = true;
  globalThis.MonacoEnvironment = { getWorker: () => new EditorWorker() };
  loader.config({ monaco: monacoApi });
  editor.defineTheme(themeName("light"), themeData("light"));
  editor.defineTheme(themeName("dark"), themeData("dark"));
  registerLanguage();
  languages.registerDocumentFormattingEditProvider("typescript", {
    async provideDocumentFormattingEdits(model) {
      const source = model.getValue();
      const formatted = formatter.run === null ? null : await formatter.run(source);
      if (formatted === null || formatted === source || model.getValue() !== source) return [];
      return [{ range: model.getFullModelRange(), text: formatted }];
    },
  });
  return monacoApi;
}

const MARKER_OWNER = "sizuku";

/** The syntax error under a squiggle, or none. */
export function setParseMarker(
  model: editor.ITextModel,
  parseError: { readonly message: string; readonly line: number; readonly column: number } | null,
) {
  if (parseError === null) {
    editor.setModelMarkers(model, MARKER_OWNER, []);
    return;
  }
  const line = Math.min(parseError.line, model.getLineCount());
  const endColumn = Math.max(parseError.column + 1, model.getLineMaxColumn(line));
  editor.setModelMarkers(model, MARKER_OWNER, [
    {
      severity: MarkerSeverity.Error,
      message: parseError.message,
      startLineNumber: line,
      startColumn: parseError.column,
      endLineNumber: line,
      endColumn,
    },
  ]);
}
