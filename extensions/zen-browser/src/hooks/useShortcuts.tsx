import { Shortcut, ShortcutModel } from "../interfaces";
import { getShorcutsJsonPath } from "../util";
import fs, { existsSync } from "fs";
import { NotInstalledError } from "../components";
import { ReactNode } from "react";
import { isKeystrokeKey, normalizeModifiers, ZEN_TO_APPLESCRIPT_MODIFIER } from "../util/applescript";

export function useShortcuts(): { shortcuts: Shortcut[]; errorView: ReactNode } {
  const shortcutsPath = getShorcutsJsonPath();

  if (!existsSync(shortcutsPath)) {
    return { shortcuts: [], errorView: <NotInstalledError /> };
  }
  const file = fs.readFileSync(shortcutsPath, "utf8");
  const { shortcuts: shortcutModels } = JSON.parse(file) as { shortcuts: ShortcutModel[] };

  // Only shortcuts that can be replayed safely through System Events are kept:
  // a single alphanumeric key plus at least one known modifier.
  const shortcuts: Shortcut[] = [];
  for (const s of shortcutModels) {
    if (!isKeystrokeKey(s.key)) continue;
    const modifiers = normalizeModifiers(
      Object.entries(s.modifiers ?? {})
        .filter(([, enabled]) => enabled === true)
        .map(([name]) => ZEN_TO_APPLESCRIPT_MODIFIER[name]),
    );
    if (modifiers.length === 0) continue;
    shortcuts.push({ id: s.id, key: s.key, modifiers });
  }

  return { shortcuts, errorView: undefined };
}
