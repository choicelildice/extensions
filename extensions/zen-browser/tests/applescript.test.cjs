const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadModule() {
  const source = readFileSync(path.join(__dirname, "..", "src", "util", "applescript.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, { exports });
  return exports;
}

const { keystrokeScript, parseShortcutPreference, normalizeModifiers, isKeystrokeKey } = loadModule();

test("keystrokeScript emits a System Events keystroke with known modifiers", () => {
  assert.equal(keystrokeScript("t", ["command"]), 'keystroke "t" using {command down}');
  assert.equal(keystrokeScript("1", ["control"]), 'keystroke "1" using {control down}');
  assert.equal(keystrokeScript("T", ["shift", "command"]), 'keystroke "t" using {command down, shift down}');
});

test("keystrokeScript rejects keys that could break out of the AppleScript string", () => {
  assert.throws(() => keystrokeScript('"', ["command"]), /Unsupported shortcut key/);
  assert.throws(() => keystrokeScript("\\", ["command"]), /Unsupported shortcut key/);
  assert.throws(() => keystrokeScript('t" & do shell script "id', ["command"]), /Unsupported shortcut key/);
  assert.throws(() => keystrokeScript("", ["command"]), /Unsupported shortcut key/);
  assert.throws(() => keystrokeScript("VK_RIGHT", ["command"]), /Unsupported shortcut key/);
});

test("unknown modifiers are dropped and an empty set is rejected", () => {
  assert.deepEqual([...normalizeModifiers(["fn", "command", undefined, "command"])], ["command"]);
  assert.throws(() => keystrokeScript("t", ["fn"]), /at least one modifier/);
  assert.throws(() => keystrokeScript("t", []), /at least one modifier/);
});

test("parseShortcutPreference reads the New Tab Shortcut preference", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference("command t"))), { key: "t", modifiers: ["command"] });
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference("ctrl+shift+n"))), {
    key: "n",
    modifiers: ["control", "shift"],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference("hyper t"))), {
    key: "t",
    modifiers: ["command", "option", "control", "shift"],
  });
});

test("parseShortcutPreference tolerates a trailing space (regression for the charAt bug)", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference("command t "))), { key: "t", modifiers: ["command"] });
});

test("parseShortcutPreference falls back to ⌘T for empty or malformed input", () => {
  const fallback = { key: "t", modifiers: ["command"] };
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference(""))), fallback);
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference(undefined))), fallback);
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference('command "'))), fallback);
  assert.deepEqual(JSON.parse(JSON.stringify(parseShortcutPreference("t"))), fallback);
});

test("isKeystrokeKey accepts exactly one alphanumeric character", () => {
  assert.equal(isKeystrokeKey("a"), true);
  assert.equal(isKeystrokeKey("0"), true);
  assert.equal(isKeystrokeKey("ab"), false);
  assert.equal(isKeystrokeKey("-"), false);
  assert.equal(isKeystrokeKey(undefined), false);
});
