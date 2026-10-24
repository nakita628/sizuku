import { getLanguage } from "../services/studio.js";

export function readLanguageStatus() {
  return getLanguage().status;
}

export function complete(input: { readonly source: string; readonly offset: number }) {
  return getLanguage().complete(input.source, input.offset);
}

export function completeDetail(input: {
  readonly source: string;
  readonly offset: number;
  readonly name: string;
}) {
  return getLanguage().detail(input.source, input.offset, input.name);
}

export function hover(input: { readonly source: string; readonly offset: number }) {
  return getLanguage().hover(input.source, input.offset);
}

export function signature(input: { readonly source: string; readonly offset: number }) {
  return getLanguage().signature(input.source, input.offset);
}

export function diagnostics(input: { readonly source: string }) {
  return getLanguage().diagnostics(input.source);
}
