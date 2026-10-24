type Dialect = "sqlite" | "postgresql" | "mysql";

/** A bound value written as a SQL literal: strings quoted, NULL, numbers as they are. */
function literal(dialect: Dialect, value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") {
    return dialect === "postgresql" ? (value ? "TRUE" : "FALSE") : value ? "1" : "0";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `'${text.replaceAll("'", "''")}'`;
}

/**
 * The statement with its parameters written in, for the SQL page, which runs a statement as it
 * is typed: `$1`, `$2`, ... on PostgreSQL, and each `?` in turn elsewhere. A placeholder inside a
 * quoted string or identifier is left alone, and one without a value stays a placeholder.
 */
export function inlineParams(sql: string, params: readonly unknown[], dialect: Dialect) {
  let next = 0;
  let out = "";
  let quote: string | null = null;
  for (let at = 0; at < sql.length; at++) {
    const char = sql.charAt(at);
    if (quote !== null) {
      out += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      out += char;
      continue;
    }
    if (dialect === "postgresql" && char === "$") {
      const digits = /^\d+/u.exec(sql.slice(at + 1))?.[0] ?? "";
      const index = Number(digits) - 1;
      if (digits !== "" && index < params.length) {
        out += literal(dialect, params[index]);
        at += digits.length;
        continue;
      }
    }
    if (dialect !== "postgresql" && char === "?" && next < params.length) {
      out += literal(dialect, params[next++]);
      continue;
    }
    out += char;
  }
  return out;
}
