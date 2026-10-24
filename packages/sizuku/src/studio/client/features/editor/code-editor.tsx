import { Editor } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor/editor/editor.api.js";
import { useEffect, useRef } from "react";
import { useUiStore } from "../../lib/store.js";
import { BASE_OPTIONS, setupMonaco, themeName } from "./monaco.js";

/** Keys a view binds on its editor: Ctrl/Cmd+S, Ctrl/Cmd+Enter, ... */
export type EditorCommand = {
  readonly keys: "save" | "run";
  readonly run: () => void;
};

/**
 * A Monaco editor in the studio's theme and with the editor settings of this browser. `path`
 * names its model, so two editors (the schema, the SQL console) never share an undo history.
 */
export function CodeEditor({
  path,
  language,
  value,
  tabSize = 2,
  insertSpaces = true,
  commands = [],
  onChange,
  onMount,
}: {
  readonly path: string;
  readonly language: "typescript" | "sql";
  readonly value: string;
  readonly tabSize?: number;
  readonly insertSpaces?: boolean;
  readonly commands?: readonly EditorCommand[];
  readonly onChange: (text: string) => void;
  readonly onMount?: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
}) {
  const monaco = setupMonaco();
  const theme = useUiStore((s) => s.theme);
  const settings = useUiStore((s) => s.editor);
  const mounted = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  // The commands are bound once on mount; they call through this, so they run the latest closures.
  const latest = useRef(commands);
  useEffect(() => {
    latest.current = commands;
  });

  useEffect(() => {
    mounted.current?.getModel()?.updateOptions({ tabSize, insertSpaces });
  }, [tabSize, insertSpaces]);

  return (
    <Editor
      path={path}
      language={language}
      value={value}
      theme={themeName(theme)}
      options={{
        ...BASE_OPTIONS,
        fontSize: settings.fontSize,
        lineHeight: Math.round(settings.fontSize * 1.6),
        minimap: { enabled: settings.minimap },
        wordWrap: settings.wordWrap ? "on" : "off",
        tabSize,
        insertSpaces,
      }}
      keepCurrentModel
      loading={<div className="p-4 text-code text-muted">Loading editor…</div>}
      onMount={(editor) => {
        mounted.current = editor;
        editor.getModel()?.updateOptions({ tabSize, insertSpaces });
        const bind = (keys: EditorCommand["keys"], keybinding: number) =>
          editor.addCommand(keybinding, () => latest.current.find((c) => c.keys === keys)?.run());
        bind("save", monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS);
        bind("run", monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter);
        // Monaco binds Ctrl+Shift+I on Linux; Shift+Alt+F formats everywhere.
        editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
          void editor.getAction("editor.action.formatDocument")?.run();
        });
        onMount?.(editor);
      }}
      onChange={(text) => {
        if (text !== undefined) onChange(text);
      }}
    />
  );
}
