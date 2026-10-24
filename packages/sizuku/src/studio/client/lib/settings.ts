import { loadJson, saveJson } from "./storage.js";

/** How the editor looks and behaves; kept per browser. The formatter's options live in the project. */
export type EditorSettings = {
  readonly fontSize: number;
  readonly minimap: boolean;
  readonly wordWrap: boolean;
  readonly formatOnSave: boolean;
  readonly autoSave: boolean;
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 13,
  minimap: false,
  wordWrap: false,
  formatOnSave: false,
  autoSave: false,
};

const KEY = "sizuku-studio:editor";

export function loadEditorSettings(): EditorSettings {
  const stored = loadJson(KEY);
  if (typeof stored !== "object" || stored === null) return DEFAULT_EDITOR_SETTINGS;
  const value = stored as Partial<Record<keyof EditorSettings, unknown>>;
  const bool = (key: keyof EditorSettings) =>
    typeof value[key] === "boolean"
      ? (value[key] as boolean)
      : (DEFAULT_EDITOR_SETTINGS[key] as boolean);
  const fontSize =
    typeof value.fontSize === "number" && value.fontSize >= 9 && value.fontSize <= 32
      ? value.fontSize
      : DEFAULT_EDITOR_SETTINGS.fontSize;
  return {
    fontSize,
    minimap: bool("minimap"),
    wordWrap: bool("wordWrap"),
    formatOnSave: bool("formatOnSave"),
    autoSave: bool("autoSave"),
  };
}

export function saveEditorSettings(settings: EditorSettings) {
  saveJson(KEY, settings);
}

/** oxfmt's defaults, shown for every option the project's config leaves out. */
export const FORMAT_DEFAULTS = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  arrowParens: "always",
} as const;
