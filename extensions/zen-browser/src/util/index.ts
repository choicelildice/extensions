import { getPreferenceValues } from "@raycast/api";
import { executeSQL } from "@raycast/utils";
import { HistoryEntry, WorkspaceModel, SessionSpace } from "../interfaces";
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { LIKE_ESCAPE_CLAUSE, likeContains, parseLimit, searchTerms } from "./sql";
import { keystrokeScript, parseShortcutPreference } from "./applescript";
import { decodeMozLz4 } from "./mozlz4";

const userDataDirectoryPath = () => {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.profilesDirectory) {
    return preferences.profilesDirectory;
  }

  // os.homedir() honours USERPROFILE on Windows, where HOME is usually unset.
  const home = homedir();
  if (process.platform == "darwin") {
    return path.join(home, "Library", "Application Support", "zen", "Profiles");
  } else {
    return path.join(home, "AppData", "Roaming", "zen", "Profiles");
  }
};

const getProfileName = (userDirectoryPath: string) => {
  const profiles = fs.readdirSync(userDirectoryPath);
  const preferences = getPreferenceValues();

  const customProfile = profiles.filter((profile) => profile.endsWith(preferences.profileDirectorySuffix))[0];
  if (customProfile) return customProfile;

  const releaseProfile = profiles.filter((profile) => profile.endsWith(".Default (release)"))[0];
  if (releaseProfile) return releaseProfile;

  const betaProfile = profiles.filter((profile) => profile.endsWith(".Default (beta)"))[0];
  if (betaProfile) return betaProfile;

  const alphaProfile = profiles.filter((profile) => profile.endsWith(".Default (alpha)"))[0];
  if (alphaProfile) return alphaProfile;

  const anyDefaultProfile = profiles.filter((profile) => profile.includes(".Default ("))[0];
  if (anyDefaultProfile) return anyDefaultProfile;

  return "";
};

// TODO: Use shortcuts from zen-keyboard-shortcuts.json instead
export const getNewTabShortcut = () => {
  const preferences = getPreferenceValues();
  const { key, modifiers } = parseShortcutPreference(preferences.newTabShortcut);
  return keystrokeScript(key, modifiers);
};

export const getPlacesDbPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "places.sqlite");
};

export const getShorcutsJsonPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "zen-keyboard-shortcuts.json");
};

export const DEFAULT_LIMIT_RESULTS = 50;

const whereClauses = (terms: string[]) => {
  return terms.map((t) => `moz_places.title LIKE ${likeContains(t)} ${LIKE_ESCAPE_CLAUSE}`).join(" AND ");
};

export const getHistoryQuery = (query?: string, limitResults?: number) => {
  const preferences = getPreferenceValues();
  const terms = searchTerms(query);
  const whereClause = terms.length > 0 ? `WHERE ${whereClauses(terms)}` : "";
  const limit = parseLimit(limitResults ?? preferences.limitResults, DEFAULT_LIMIT_RESULTS);

  return `SELECT
            id, url, title,
            datetime(last_visit_date/1000000,'unixepoch') as lastVisited
          FROM moz_places
          ${whereClause}
          ORDER BY last_visit_date DESC LIMIT ${limit};`;
};

export const getHistory = async (query?: string, limitResults?: number) => {
  const inQuery = getHistoryQuery(query, limitResults);
  const dbPath = getPlacesDbPath();

  if (!fs.existsSync(dbPath)) {
    return "Zen Browser is not installed.";
  }

  return await executeSQL<HistoryEntry>(dbPath, inQuery);
};

export const getBookmarksDirectoryPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "bookmarkbackups");
};

export const getSessionManagerExtensionPath = (extensionId: string) => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(
    userDirectoryPath,
    getProfileName(userDirectoryPath),
    "storage",
    "default",
    `moz-extension+++${extensionId}`,
    "idb",
  );
};

export const getSessionInactivePath = async () => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "sessionstore.jsonlz4");
};

export const getZenSessionsPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "zen-sessions.jsonlz4");
};

export const readZenWorkspacesFromSession = (): WorkspaceModel[] => {
  const raw = fs.readFileSync(getZenSessionsPath());
  const session: { spaces?: SessionSpace[] } = decodeLZ4(raw);
  return (session.spaces ?? []).map((space, index) => ({
    uuid: space.uuid,
    name: space.name,
    icon: space.icon ?? "",
    position: space.position ?? index * 1000,
    is_default: index === 0,
  }));
};

export const getSessionActivePath = async () => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(
    userDirectoryPath,
    await getProfileName(userDirectoryPath),
    "sessionstore-backups",
    "recovery.jsonlz4",
  );
};

export function decodeLZ4(buffer: Buffer) {
  return JSON.parse(decodeMozLz4(buffer).toString("utf8"));
}
