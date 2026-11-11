const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypescript(relativePath) {
  const fileName = join(__dirname, "..", relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function("require", "exports", "module", outputText)(require, module.exports, module);
  return module.exports;
}

function readGlbNodeNames(relativePath) {
  const glb = readFileSync(join(__dirname, "..", relativePath));
  assert.equal(glb.toString("ascii", 0, 4), "glTF", relativePath + " is a GLB file");
  assert.equal(glb.readUInt32LE(4), 2, relativePath + " uses GLB v2");
  const jsonChunkLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.toString("utf8", 20, 20 + jsonChunkLength));
  return new Set((json.nodes ?? []).map((node) => node.name).filter(Boolean));
}

const { PART_GROUP_NODE_PREFIXES, getPartGroupForNodeName } = loadTypescript(
  "src/components/features/digital-twin/presentation/part-groups.ts",
);
const bodyNames = readGlbNodeNames("public/models/digital-twin/body/coffee_machine_03_v2.glb");
const clusterNames = readGlbNodeNames("public/models/digital-twin/cluster-03/final.glb");
const knownNames = new Set([...bodyNames, ...clusterNames]);

test("part groups point to node names that exist in the body or Cluster 03 GLB", () => {
  for (const [group, prefixes] of Object.entries(PART_GROUP_NODE_PREFIXES)) {
    for (const nameOrPrefix of prefixes) {
      const exists = nameOrPrefix.endsWith("-")
        ? [...knownNames].some((name) => name.startsWith(nameOrPrefix))
        : knownNames.has(nameOrPrefix);
      assert.equal(exists, true, group + " mapping " + nameOrPrefix + " exists in a model asset");
    }
  }
});

test("unmapped model nodes are assigned to other", () => {
  assert.equal(getPartGroupForNodeName("node-that-is-not-mapped"), "other");
  assert.equal(getPartGroupForNodeName("Mayxoay1-1"), "grinder");
});
