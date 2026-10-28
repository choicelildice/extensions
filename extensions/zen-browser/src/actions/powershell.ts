// PowerShell single-quoted literals do not expand $(...) subexpressions or
// variables, so user input passed through psLiteral stays data, not code.
export function psLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

export function newTabPowerShellScript(query?: string): string {
  return query ? `Start-Process "zen" "-search" ${psLiteral(query)}` : `Start-Process "zen"`;
}

/**
 * Combines a search-engine URL prefix with the user's query. The query is
 * percent-encoded so spaces, `#` and `&` cannot truncate the URL or inject
 * extra parameters. An empty prefix means "browser default": the bare query is
 * returned unchanged for Zen to resolve itself.
 */
export function buildSearchTarget(prefix: string, query?: string | null): string {
  const q = query ?? "";
  return prefix ? `${prefix}${encodeURIComponent(q)}` : q;
}

export function openUrlPowerShellScript(url: string): string {
  return `Start-Process "zen" ${psLiteral(url)}`;
}

export function openSpacePowerShellScript(spaceId: string): string {
  return `Start-Process "zen" -ArgumentList @("--space", ${psLiteral(spaceId)})`;
}
