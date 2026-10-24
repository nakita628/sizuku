import type { LayoutPositions } from "../../../types/index.js";
import { loadJson, saveJson } from "./storage.js";

/** Where the cards of a schema were left, kept per schema file in this browser. */
export function layoutStorageKey(schemaPath: string) {
  return `sizuku-studio:layout:${schemaPath}`;
}

function isPosition(value: unknown): value is { readonly x: number; readonly y: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { x?: unknown }).x === "number" &&
    typeof (value as { y?: unknown }).y === "number"
  );
}

// A position that does not read is left out rather than taking the whole layout with it.
export function loadLayout(key: string): LayoutPositions {
  const stored = loadJson(key);
  if (typeof stored !== "object" || stored === null) return {};
  return Object.fromEntries(
    Object.entries(stored).flatMap(([name, position]) =>
      isPosition(position) ? [[name, { x: position.x, y: position.y }]] : [],
    ),
  );
}

export function saveLayout(key: string, positions: LayoutPositions) {
  saveJson(key, positions);
}

/** Hands a file to the browser to save. */
export function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
