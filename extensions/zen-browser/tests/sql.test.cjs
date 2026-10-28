const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadModule() {
  const source = readFileSync(path.join(__dirname, "..", "src", "util", "sql.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, { exports });
  return exports;
}

const { sqlLiteral, likeContains, LIKE_ESCAPE_CLAUSE, searchTerms, parseLimit } = loadModule();

test("sqlLiteral wraps values in single quotes and doubles embedded single quotes", () => {
  assert.equal(sqlLiteral("plain"), "'plain'");
  assert.equal(sqlLiteral("O'Reilly"), "'O''Reilly'");
});

test("a quote in a search term cannot terminate the string literal", () => {
  assert.equal(likeContains("x' OR 1=1 --"), "'%x'' OR 1=1 --%'");
});

test("LIKE wildcards and the escape character are neutralised", () => {
  assert.equal(likeContains("100%"), "'%100\\%%'");
  assert.equal(likeContains("a_b"), "'%a\\_b%'");
  assert.equal(likeContains("back\\slash"), "'%back\\\\slash%'");
  assert.equal(LIKE_ESCAPE_CLAUSE, "ESCAPE '\\'");
});

test("searchTerms splits on whitespace and drops empty terms", () => {
  // Spread into this realm's Array: values from the VM context have a different prototype.
  assert.deepEqual([...searchTerms("  foo   bar ")], ["foo", "bar"]);
  assert.deepEqual([...searchTerms("")], []);
  assert.deepEqual([...searchTerms(undefined)], []);
});

test("parseLimit only accepts positive integers and otherwise falls back", () => {
  assert.equal(parseLimit("50", 10), 50);
  assert.equal(parseLimit(25, 10), 25);
  assert.equal(parseLimit("0", 10), 10);
  assert.equal(parseLimit("-5", 10), 10);
  assert.equal(parseLimit("abc", 10), 10);
  assert.equal(parseLimit("10; DROP TABLE moz_places", 10), 10);
  assert.equal(parseLimit(undefined, 10), 10);
});
