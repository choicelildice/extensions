/**
 * Builders for the few AppleScript snippets this extension runs. Every value that
 * ends up inside the script is validated against a whitelist, so nothing read from
 * preferences or from Zen's `zen-keyboard-shortcuts.json` can break out of a string.
 */

export const APPLESCRIPT_MODIFIERS = ["command", "option", "control", "shift"] as const;
export type AppleScriptModifier = (typeof APPLESCRIPT_MODIFIERS)[number];

/** Zen's shortcut modifier names mapped to System Events modifier names. `accel` is ⌘ on macOS. */
export const ZEN_TO_APPLESCRIPT_MODIFIER: Record<string, AppleScriptModifier> = {
  control: "control",
  alt: "option",
  shift: "shift",
  meta: "command",
  accel: "command",
};

/** Aliases accepted in the "New Tab Shortcut" preference, e.g. "cmd t". */
export const PREFERENCE_MODIFIER_ALIASES: Record<string, AppleScriptModifier> = {
  cmd: "command",
  command: "command",
  super: "command",
  meta: "command",
  ctrl: "control",
  control: "control",
  opt: "option",
  option: "option",
  alt: "option",
  shift: "shift",
};

const SINGLE_KEY = /^[a-z0-9]$/i;

export function isKeystrokeKey(key: unknown): key is string {
  return typeof key === "string" && SINGLE_KEY.test(key);
}

export function isAppleScriptModifier(value: unknown): value is AppleScriptModifier {
  return typeof value === "string" && (APPLESCRIPT_MODIFIERS as readonly string[]).includes(value);
}

/** Keeps only known modifiers, in a stable order, without duplicates. */
export function normalizeModifiers(modifiers: readonly unknown[]): AppleScriptModifier[] {
  return APPLESCRIPT_MODIFIERS.filter((m) => modifiers.includes(m));
}

/**
 * Returns `keystroke "<key>" using {<mods>}` for System Events.
 * Throws when the key is not a single alphanumeric character or no modifier is given.
 */
export function keystrokeScript(key: string, modifiers: readonly unknown[]): string {
  if (!isKeystrokeKey(key)) {
    throw new Error(`Unsupported shortcut key "${String(key)}": expected a single letter or digit.`);
  }
  const mods = normalizeModifiers(modifiers);
  if (mods.length === 0) {
    throw new Error("A keyboard shortcut needs at least one modifier.");
  }
  return `keystroke "${key.toLowerCase()}" using {${mods.map((m) => `${m} down`).join(", ")}}`;
}

/**
 * Parses the "New Tab Shortcut" preference ("command t", "cmd+t", "hyper t", …).
 * Falls back to ⌘T when the preference is empty or malformed.
 */
export function parseShortcutPreference(value: string | undefined): { key: string; modifiers: AppleScriptModifier[] } {
  const fallback = { key: "t", modifiers: ["command"] as AppleScriptModifier[] };
  const tokens = (value ?? "")
    .toLowerCase()
    .split(/[\s+-]+/)
    .filter(Boolean);
  if (tokens.length === 0) return fallback;

  const key = tokens[tokens.length - 1];
  if (!isKeystrokeKey(key)) return fallback;

  const modifierTokens = tokens.slice(0, -1);
  const modifiers = modifierTokens.includes("hyper")
    ? [...APPLESCRIPT_MODIFIERS]
    : normalizeModifiers(modifierTokens.map((t) => PREFERENCE_MODIFIER_ALIASES[t]));
  if (modifiers.length === 0) return fallback;

  return { key, modifiers };
}
