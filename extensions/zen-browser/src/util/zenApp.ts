import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import path from "path";

/** Zen added the `--space <name|uuid>` command-line flag in 1.23.3b (zen-browser/desktop#15074). */
const MIN_SPACE_FLAG_VERSION = [1, 23, 3];

const MACOS_APP_CANDIDATES = [
  "/Applications/Zen.app",
  path.join(homedir(), "Applications", "Zen.app"),
  "/Applications/Zen Browser.app",
  path.join(homedir(), "Applications", "Zen Browser.app"),
];

/** Returns the path to the Zen .app bundle on macOS, or undefined when it cannot be found. */
export function getZenAppBundlePath(): string | undefined {
  if (process.platform !== "darwin") return undefined;
  return MACOS_APP_CANDIDATES.find((candidate) => existsSync(candidate));
}

/** Returns the path to the Zen executable on macOS, or undefined when it cannot be found. */
export function getZenExecutablePath(): string | undefined {
  const bundle = getZenAppBundlePath();
  if (!bundle) return undefined;
  const executable = path.join(bundle, "Contents", "MacOS", "zen");
  return existsSync(executable) ? executable : undefined;
}

/**
 * Reads the installed Zen version from the app bundle's Info.plist, e.g. "1.23.4b".
 * Returns undefined when it cannot be determined.
 */
export function getZenVersion(): string | undefined {
  const bundle = getZenAppBundlePath();
  if (!bundle) return undefined;
  try {
    const plist = readFileSync(path.join(bundle, "Contents", "Info.plist"), "utf8");
    const match = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/** Parses "1.23.4b" into [1, 23, 4], ignoring any channel suffix. */
export function parseZenVersion(version: string): number[] {
  return version
    .replace(/[^0-9.]/g, "")
    .split(".")
    .filter(Boolean)
    .map((part) => parseInt(part, 10));
}

export function versionAtLeast(version: number[], minimum: number[]): boolean {
  for (let i = 0; i < minimum.length; i++) {
    const current = version[i] ?? 0;
    if (current > minimum[i]) return true;
    if (current < minimum[i]) return false;
  }
  return true;
}

/**
 * Whether the installed Zen can switch spaces via `zen --space <name|uuid>`.
 * On macOS this is checked against the bundle version; on other platforms we
 * optimistically assume a current Zen, since the flag has shipped on every channel.
 */
export function zenSupportsSpaceFlag(): boolean {
  if (process.platform !== "darwin") return true;
  const version = getZenVersion();
  if (!version) return false;
  return versionAtLeast(parseZenVersion(version), MIN_SPACE_FLAG_VERSION);
}

/** Zen stores space ids as braced UUIDs, e.g. "{0c34d9c4-f922-4785-b2b2-61f90f7f9798}". */
const ZEN_SPACE_ID = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;

/**
 * Whether `value` looks like a Zen space id. Space ids are read from
 * `zen-sessions.jsonlz4`, which sync or an add-on could write, so they are
 * validated before being handed to a shell or command line.
 */
export function isZenSpaceId(value: unknown): value is string {
  return typeof value === "string" && ZEN_SPACE_ID.test(value);
}
