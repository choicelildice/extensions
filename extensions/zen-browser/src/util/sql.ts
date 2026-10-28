/**
 * Helpers for building SQL safely when parameter binding is not available.
 * `useSQL` / `executeSQL` from @raycast/utils accept a query string only, so every
 * user-controlled value has to be escaped before it is spliced into the statement.
 */

/** Wraps a value in a single-quoted SQL string literal, doubling embedded quotes. */
export function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Builds a `LIKE` pattern literal that matches `term` as a plain substring.
 * `%`, `_` and the escape character itself are escaped so they are not treated as
 * wildcards; use together with `LIKE_ESCAPE_CLAUSE`.
 */
export function likeContains(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
  return sqlLiteral(`%${escaped}%`);
}

/** The ESCAPE clause that pairs with {@link likeContains}. */
export const LIKE_ESCAPE_CLAUSE = "ESCAPE '\\'";

/** Splits a search query into non-empty terms. */
export function searchTerms(query?: string): string[] {
  return query ? query.trim().split(/\s+/).filter(Boolean) : [];
}

/**
 * Parses a LIMIT value coming from preferences. Returns `fallback` unless the value
 * is a positive integer, so arbitrary text can never reach the statement.
 */
export function parseLimit(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? "").trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
