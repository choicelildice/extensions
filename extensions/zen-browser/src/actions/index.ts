import { Clipboard, getPreferenceValues } from "@raycast/api";
import { runAppleScript, runPowerShellScript } from "@raycast/utils";
import { execFile, spawn } from "child_process";
import { platform } from "os";
import { promisify } from "util";
import { SEARCH_ENGINE } from "../constants";
import { Preferences, Shortcut, WorkspaceEntry } from "../interfaces";
import { getNewTabShortcut } from "../util";
import { getZenAppBundlePath, getZenExecutablePath, isZenSpaceId, zenSupportsSpaceFlag } from "../util/zenApp";
import { AppleScriptModifier, keystrokeScript } from "../util/applescript";

const execFileAsync = promisify(execFile);

/**
 * Hands `args` to Zen on macOS.
 *
 * When Zen is already running, the new process forwards its arguments to the running
 * instance and exits. When it is not, the spawned process *is* the browser and would
 * never exit, so it is detached with its stdio ignored and never awaited: awaiting it
 * (or using execFile, whose 1 MB maxBuffer SIGTERMs a chatty child) could hang the
 * Raycast command or kill the user's browser. Zen is then brought to the front with
 * `open -a`, which returns immediately.
 */
async function launchZen(zenExecutable: string, args: string[]): Promise<void> {
  const child = spawn(zenExecutable, args, { detached: true, stdio: "ignore" });
  child.unref();
  const bundle = getZenAppBundlePath();
  if (bundle) {
    await execFileAsync("/usr/bin/open", ["-a", bundle]);
  }
}

import { buildSearchTarget, openSpacePowerShellScript } from "./powershell";

export * from "./powershell";

/**
 * Activates Zen browser and waits for it to become frontmost.
 * Returns the AppleScript code for the activation and wait logic.
 */
function getZenActivationScript(activateRaycastFirst = false): string {
  const lines = [
    activateRaycastFirst ? 'tell application "Raycast" to activate' : null,
    'tell application "Zen" to activate',
    'tell application "System Events"',
    "  repeat 10 times",
    '    if frontmost of process "Zen" then exit repeat',
    "    delay 0.1",
    "  end repeat",
    "end tell",
  ].filter((line): line is string => Boolean(line)); // Filter out null line

  return lines.join("\n");
}

async function executeKeystrokeInZen(
  keystroke: string,
  modifiers: AppleScriptModifier[],
  activateRaycastFirst = false,
): Promise<void> {
  const script = [
    getZenActivationScript(activateRaycastFirst),
    'tell application "System Events"',
    `  ${keystrokeScript(keystroke, modifiers)}`,
    "end tell",
  ].join("\n");

  await runAppleScript(script);
}

export async function runShortcut(shortcut: Shortcut) {
  const script = [
    getZenActivationScript(true),
    'tell application "System Events"',
    `  ${keystrokeScript(shortcut.key, shortcut.modifiers)}`,
    "end tell",
  ].join("\n");

  await runAppleScript(script);
}

/**
 * Switches Zen to the given workspace.
 *
 * Zen 1.23.3b+ accepts `--space <name|uuid>` on the command line and forwards it to the
 * running instance, so no keyboard shortcut is needed. This is what makes workspaces
 * beyond the tenth reachable: Zen only defines switch shortcuts for workspaces 1-10.
 * Older Zen versions fall back to simulating the workspace's keyboard shortcut.
 */
export async function openWorkspace(workspace: WorkspaceEntry): Promise<void> {
  // The id comes from Zen's session file; only a well-formed UUID is ever passed to a process.
  if (zenSupportsSpaceFlag() && isZenSpaceId(workspace.uuid)) {
    if (platform() === "win32") {
      await runPowerShellScript(openSpacePowerShellScript(workspace.uuid));
      return;
    }
    const zenExecutable = getZenExecutablePath();
    if (zenExecutable) {
      // The UUID is unique even when two spaces share a name.
      await launchZen(zenExecutable, ["--space", workspace.uuid]);
      return;
    }
  }

  if (workspace.shortcut) {
    await runShortcut(workspace.shortcut);
    return;
  }

  throw new Error(
    "This workspace has no keyboard shortcut and the installed Zen does not support `--space`. Update Zen to 1.23.3 or newer.",
  );
}

/** Builds the final string Zen should receive for a new-tab search: a URL for an explicit engine, or the bare query. */
export function newTabTarget(queryText: string | null | undefined): string {
  const prefix = SEARCH_ENGINE[getPreferenceValues<Preferences>().searchEngine.toLowerCase()] ?? "";
  return buildSearchTarget(prefix, queryText);
}

/**
 * Opens a new Zen tab, optionally searching for `queryText`.
 *
 * Preferred path (macOS, Zen found): hand the target to the Zen executable as an argument.
 * Zen forwards `--new-tab <url>` / `--search <terms>` to the running instance, so nothing
 * touches the clipboard or relies on simulated keystrokes.
 *
 * Fallback: the previous clipboard-and-paste approach, now restoring the user's clipboard afterwards.
 */
export async function openNewTab(queryText: string | null | undefined) {
  const query = (queryText ?? "").trim();
  const target = newTabTarget(query);
  const zenExecutable = getZenExecutablePath();

  if (zenExecutable) {
    if (!query) {
      await executeKeystrokeInZen("t", ["command"], true);
      return;
    }
    const usesExplicitEngine = target !== query;
    const args = usesExplicitEngine ? ["--new-tab", target] : ["--search", query];
    await launchZen(zenExecutable, args);
    return;
  }

  const previousClipboard = await Clipboard.read().catch(() => undefined);
  await Clipboard.copy(target);
  const script = [
    getZenActivationScript(true),
    'tell application "System Events"',
    `  ${getNewTabShortcut()}`,
    "  delay 0.1",
    '  keystroke "a" using {command down}',
    "  key code 51",
    '  keystroke "v" using {command down}',
    "  key code 36",
    "end tell",
  ].join("\n");

  try {
    await runAppleScript(script);
  } finally {
    if (previousClipboard) {
      await Clipboard.copy({
        text: previousClipboard.text,
        html: previousClipboard.html,
        file: previousClipboard.file,
      });
    }
  }
}

export async function openNewWindow() {
  await executeKeystrokeInZen("n", ["command"]);
}

export async function openNewPrivateWindow() {
  await executeKeystrokeInZen("p", ["command", "shift"]);
}
