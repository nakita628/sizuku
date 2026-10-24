import { create } from "zustand";
import { loadEditorSettings, saveEditorSettings } from "./settings.js";
import type { EditorSettings } from "./settings.js";
import { loadString, saveString } from "./storage.js";

export type Theme = "light" | "dark";

const THEME_KEY = "sizuku-studio:theme";
const SIDEBAR_KEY = "sizuku-studio:sidebar";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function initialTheme(): Theme {
  const stored = loadString(THEME_KEY);
  const theme: Theme =
    stored === "light" || stored === "dark"
      ? stored
      : typeof globalThis.matchMedia === "function" &&
          globalThis.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  applyTheme(theme);
  return theme;
}

type UiStore = {
  readonly theme: Theme;
  readonly sidebarOpen: boolean;
  readonly settingsOpen: boolean;
  readonly editor: EditorSettings;
  readonly toggleTheme: () => void;
  readonly toggleSidebar: () => void;
  readonly setSettingsOpen: (open: boolean) => void;
  readonly setEditor: (patch: Partial<EditorSettings>) => void;
};

export const useUiStore = create<UiStore>()((set, get) => ({
  theme: initialTheme(),
  sidebarOpen: loadString(SIDEBAR_KEY) !== "closed",
  settingsOpen: false,
  editor: loadEditorSettings(),
  toggleTheme: () => {
    const theme = get().theme === "dark" ? "light" : "dark";
    saveString(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleSidebar: () => {
    const sidebarOpen = !get().sidebarOpen;
    saveString(SIDEBAR_KEY, sidebarOpen ? "open" : "closed");
    set({ sidebarOpen });
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setEditor: (patch) => {
    const editor = { ...get().editor, ...patch };
    saveEditorSettings(editor);
    set({ editor });
  },
}));
