import { javascript } from "@codemirror/lang-javascript";
import { classHighlighter, highlightCode } from "@lezer/highlight";

const PARSER = javascript({ typescript: true }).language.parser;

/** A TypeScript snippet with syntax highlighting, tokenised by CodeMirror's parser. */
export function CodeBlock({
  code,
  className = "",
}: {
  readonly code: string;
  readonly className?: string;
}) {
  const tokens: { readonly at: number; readonly text: string; readonly className: string }[] = [];
  const put = (text: string, classes: string) => {
    const last = tokens.at(-1);
    tokens.push({
      at: last === undefined ? 0 : last.at + last.text.length,
      text,
      className: classes,
    });
  };
  highlightCode(code, PARSER.parse(code), classHighlighter, put, () => put("\n", ""));
  return (
    <pre className={`m-0 overflow-auto font-mono text-code leading-relaxed text-ink ${className}`}>
      <code>
        {tokens.map((token) =>
          token.className === "" ? (
            token.text
          ) : (
            <span key={token.at} className={token.className}>
              {token.text}
            </span>
          ),
        )}
      </code>
    </pre>
  );
}
