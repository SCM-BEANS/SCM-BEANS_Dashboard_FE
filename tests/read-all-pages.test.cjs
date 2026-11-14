const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const source = ts.transpileModule(fs.readFileSync("src/lib/read-all-pages.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = { exports: {} };
new Function("module", "exports", source)(loaded, loaded.exports);
const { readAllPages } = loaded.exports;

test("collects all pages in order and stops at the final page", async () => {
  const calls = [];
  const items = await readAllPages(async (page) => {
    calls.push(page);
    return { items: [page * 2, page * 2 + 1], hasNext: page < 2 };
  });
  assert.deepEqual(calls, [0, 1, 2]);
  assert.deepEqual(items, [0, 1, 2, 3, 4, 5]);
});

test("allows an empty final result and rejects inconsistent or failed reads", async () => {
  assert.deepEqual(await readAllPages(async () => ({ items: [], hasNext: false })), []);
  await assert.rejects(readAllPages(async () => ({ items: [], hasNext: true })));
  await assert.rejects(readAllPages(async () => { throw new Error("offline"); }), /offline/);
});
