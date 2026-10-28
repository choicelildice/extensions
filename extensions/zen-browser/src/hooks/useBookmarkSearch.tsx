import { getPreferenceValues } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { existsSync } from "fs";
import { ReactElement } from "react";
import { NotInstalledError } from "../components";
import { HistoryEntry, Preferences, SearchResult } from "../interfaces";
import { DEFAULT_LIMIT_RESULTS, getPlacesDbPath } from "../util";
import { LIKE_ESCAPE_CLAUSE, likeContains, parseLimit, searchTerms } from "../util/sql";
import { useRetrySQLError } from "./useRetrySQLError";

const whereClauses = (terms: string[]) => {
  return terms
    .map((t) => {
      const pattern = `${likeContains(t)} ${LIKE_ESCAPE_CLAUSE}`;
      return `(b.title LIKE ${pattern} OR p.url LIKE ${pattern})`;
    })
    .join(" AND ");
};

export const getBookmarkQuery = (query?: string, limitResults?: number) => {
  const preferences = getPreferenceValues<Preferences>();
  const terms = searchTerms(query);
  const whereClause = terms.length > 0 ? `AND ${whereClauses(terms)}` : "";
  const limit = parseLimit(limitResults ?? preferences.limitResults, DEFAULT_LIMIT_RESULTS);

  return `WITH BookmarkEntries AS (
    SELECT
      b.*,
      p.url,
      datetime(b.lastModified/1000000,'unixepoch') as lastModified,
      ROW_NUMBER() OVER (PARTITION BY b.fk ORDER BY b.id) as rn
    FROM moz_bookmarks b
    JOIN moz_places p ON b.fk = p.id
    WHERE b.type = 1 ${whereClause}
  )
  SELECT id, url, title, lastModified
  FROM BookmarkEntries
  WHERE rn = 1
  ORDER BY lastModified DESC
  LIMIT ${limit};`;
};

export function useBookmarkSearch(query: string | undefined): SearchResult<HistoryEntry> {
  const inQuery = getBookmarkQuery(query);
  const dbPath = getPlacesDbPath();

  if (!existsSync(dbPath)) {
    return { data: [], isLoading: false, errorView: <NotInstalledError /> };
  }

  const { data, isLoading, error, permissionView, revalidate } = useSQL<HistoryEntry>(dbPath, inQuery);
  useRetrySQLError({ error, onRetry: revalidate });

  return { data, isLoading, errorView: permissionView as ReactElement };
}
