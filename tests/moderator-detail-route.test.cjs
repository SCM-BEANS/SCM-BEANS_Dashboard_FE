const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { dirname, isAbsolute, join, resolve } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = join(__dirname, "..");
const cache = new Map();

function resolveSource(id, parentFile) {
  const base = id.startsWith("@/")
    ? join(root, "src", id.slice(2))
    : id.startsWith(".")
      ? resolve(dirname(parentFile), id)
      : null;
  if (!base) return null;
  for (const candidate of [base, ...[".ts", ".tsx", ".js", ".jsx"].map((ext) => base + ext)]) {
    if (existsSync(candidate) && !candidate.endsWith(".d.ts")) return candidate;
  }
  return null;
}

function loadSource(filePath) {
  const absolutePath = isAbsolute(filePath) ? filePath : join(root, filePath);
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;
  const source = readFileSync(absolutePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: absolutePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const loaded = { exports: {} };
  cache.set(absolutePath, loaded);
  const mockedRequire = (id) => {
    const resolved = resolveSource(id, absolutePath);
    return resolved ? loadSource(resolved) : require(id);
  };
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

const routes = loadSource("src/routes/routes.ts");
const { PATH_MODERATOR } = loadSource("src/routes/path.ts");
const sectionFromPath = (path) => path.slice(PATH_MODERATOR.ROOT.length + 1);

test("Moderator menu and machine-model detail routes validate IDs with project schemas", () => {
  const recipeId = "00000000-0000-0000-0000-000000000001";
  const modelId = "e6dbdebd-ec02-4f15-b07b-8f1ec12c52bb";

  assert.equal(routes.isSupportedModeratorSection(sectionFromPath(PATH_MODERATOR.MENU_RECIPE_DETAIL(recipeId))), true);
  assert.equal(routes.isSupportedModeratorSection(sectionFromPath(PATH_MODERATOR.MACHINE_MODEL_DETAIL(modelId))), true);
  assert.equal(routes.isSupportedModeratorSection("machines/models"), true);
  assert.equal(routes.isSupportedModeratorSection("machines/models/new"), true);

  assert.equal(routes.isSupportedModeratorSection("menu/not-a-recipe-id"), false);
  assert.equal(routes.isSupportedModeratorSection("machines/models/not-a-model-id"), false);
  assert.equal(routes.isSupportedModeratorSection(`machines/models/${modelId}/extra`), false);
});
