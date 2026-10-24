import { getLanguage } from "../services/studio.js";
import type { DocumentKind } from "../services/typescript.js";

type Position = {
  readonly document: DocumentKind;
  readonly source: string;
  readonly offset: number;
};

export function readLanguageStatus() {
  return getLanguage().status;
}

export function complete(input: Position) {
  return getLanguage().complete(input.document, input.source, input.offset);
}

export function completeDetail(input: Position & { readonly name: string }) {
  return getLanguage().detail(input.document, input.source, input.offset, input.name);
}

export function hover(input: Position) {
  return getLanguage().hover(input.document, input.source, input.offset);
}

export function signature(input: Position) {
  return getLanguage().signature(input.document, input.source, input.offset);
}

export function diagnostics(input: { readonly document: DocumentKind; readonly source: string }) {
  return getLanguage().diagnostics(input.document, input.source);
}
