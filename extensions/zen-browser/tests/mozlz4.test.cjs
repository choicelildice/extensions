const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadModule() {
  const source = readFileSync(path.join(__dirname, "..", "src", "util", "mozlz4.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, { exports, Buffer });
  return exports;
}

const { decodeMozLz4, decodeLz4Block, MAX_DECOMPRESSED_BYTES } = loadModule();

/** Builds a mozLz40 file from a raw LZ4 block and a declared size. */
function mozlz4(block, declaredSize) {
  const header = Buffer.alloc(12);
  header.write("mozLz40\0", 0, "latin1");
  header.writeUInt32LE(declaredSize, 8);
  return Buffer.concat([header, Buffer.from(block)]);
}

test("decodes a literals-only block", () => {
  // token 0x20 = 2 literals, no match
  const out = decodeMozLz4(mozlz4([0x20, 0x7b, 0x7d], 2));
  assert.equal(out.toString(), "{}");
});

test("decodes a block with a back-reference match", () => {
  // 4 literals "abcd", then match offset 4, length 4+0 => "abcdabcd"
  const out = decodeMozLz4(mozlz4([0x40, 0x61, 0x62, 0x63, 0x64, 0x04, 0x00, 0x00], 8));
  assert.equal(out.toString(), "abcdabcd");
});

test("rejects a wrong magic header", () => {
  const bad = Buffer.concat([Buffer.from("notmozlz"), Buffer.alloc(4), Buffer.from([0x20, 0x7b, 0x7d])]);
  assert.throws(() => decodeMozLz4(bad), /invalid magic/);
});

test("rejects a declared size above the cap instead of allocating it", () => {
  assert.throws(() => decodeMozLz4(mozlz4([0x20, 0x7b, 0x7d], MAX_DECOMPRESSED_BYTES + 1)), /exceeds/);
  assert.throws(() => decodeMozLz4(mozlz4([0x20, 0x7b, 0x7d], 0xffffffff)), /exceeds/);
});

test("rejects truncated input and bad offsets", () => {
  assert.throws(() => decodeMozLz4(mozlz4([0x50, 0x61, 0x62], 5)), /literals run past/);
  assert.throws(() => decodeMozLz4(mozlz4([0x10, 0x61, 0x00, 0x00], 10)), /invalid match offset/);
  assert.throws(() => decodeMozLz4(mozlz4([0x10, 0x61, 0x09, 0x00], 10)), /invalid match offset/);
  assert.throws(() => decodeMozLz4(mozlz4([0x10, 0x61, 0x01], 10)), /truncated match offset/);
  assert.throws(() => decodeMozLz4(mozlz4([0x20, 0x7b, 0x7d], 1)), /exceed declared output/);
  assert.throws(() => decodeMozLz4(Buffer.from("short")), /too short/);
});

test("decodeLz4Block reports the bytes written", () => {
  const out = Buffer.alloc(16);
  assert.equal(decodeLz4Block(Buffer.from([0x30, 0x61, 0x62, 0x63]), out), 3);
});
