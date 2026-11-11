const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypescript(relativePath, mocks = {}) {
  const fileName = join(__dirname, "..", relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  new Function("require", "exports", "module", outputText)(mockedRequire, module.exports, module);
  return module.exports;
}

const { parseProcedure } = loadTypescript("src/components/features/digital-twin/script/parse-procedure.ts");
const timing = {
  BREW_TIMING_ESTIMATES: { milkMs: 950 },
  estimateGrindingDuration: (grams) => Math.max(1_200, Math.min(4_000, Math.round(grams * 90))),
  estimateExtractionDuration: (ml) => Math.max(2_000, Math.min(7_000, Math.round(ml * 55))),
  estimateWaterDuration: (ml) => Math.max(600, Math.min(3_500, Math.round(ml * 40))),
  estimatePreinfusionDuration: (seconds) => Math.max(100, Math.min(30_000, Math.round(seconds * 1_000))),
  estimateStageDuration: (phase) => ({ closing: 1_200, tamping: 1_600, opening: 1_100, ejecting: 1_300, scraping: 2_200 })[phase],
};
const recipeMessages = {
  DIGITAL_TWIN_RECIPE_TWIN_MESSAGES: {
    step_grind: "Xay", step_dose: "Nạp cà phê", step_close: "Đóng cụm nén", step_tamp: "Nén",
    step_hold_tamp: "Giữ nén", step_preinfuse: "Ngâm sơ bộ", step_bloom: "Ngâm", step_extract: "Chiết xuất",
    step_dry_tamp: "Nén khô", step_open: "Mở cụm nén", step_eject: "Đẩy bã", step_return: "Về vị trí chờ",
    step_water: "Nước", step_milk: "Thêm sữa", recipe_default_missing: "Quy trình chuẩn (không tìm thấy công thức)",
  },
};
const { buildBrewScript } = loadTypescript(
  "src/components/features/digital-twin/script/build-brew-script.ts",
  { "./brew-timing-config": timing, "@/text/digital-twin/digital-twin-messages": recipeMessages },
);

test("parseProcedure accepts canonical recipe directives and values", () => {
  assert.deepEqual(parseProcedure(["DOSE:18", "TAMP:100", "HOLDTAMP:50", "EXTRACT:40"]), [
    { directive: "DOSE", value: 18 },
    { directive: "TAMP", value: 100 },
    { directive: "HOLDTAMP", value: 50 },
    { directive: "EXTRACT", value: 40 },
  ]);
  assert.deepEqual(parseProcedure(["DOSE", "EXTRACT"]), [
    { directive: "DOSE", value: null },
    { directive: "EXTRACT", value: null },
  ]);
});

test("parseProcedure recognizes older Vietnamese display strings and ignores unknown values", () => {
  assert.deepEqual(parseProcedure([
    "Xay 18 g",
    "Nén 100%",
    "Ngâm sơ bộ 3 s",
    "Chiết xuất 40 ml",
    "Thêm sữa",
    "a note with no known directive",
    "FUTURE:5",
  ]), [
    { directive: "DOSE", value: 18 },
    { directive: "TAMP", value: 100 },
    { directive: "PREINFUSE", value: 3 },
    { directive: "EXTRACT", value: 40 },
    { directive: "PREMILK", value: null },
  ]);
});

test("buildBrewScript preserves Latte procedure order and adds the fixed motion tail", () => {
  const latte = buildBrewScript(parseProcedure([
    "PREMILK:5",
    "DOSE:18",
    "TAMP:100",
    "HOLDTAMP:50",
    "PREINFUSE:3",
    "EXTRACT:40",
    "POSTMILK:20",
  ]), "Latte");

  assert.deepEqual(latte.steps.map((step) => step.kind), [
    "milk", "grind", "dose", "close", "tamp", "hold-tamp", "preinfuse", "extract", "milk", "open", "eject", "return",
  ]);
  assert.equal(latte.steps[1].label, "Xay");
  assert.equal(latte.steps[1].valueText, "18 g");
  assert.equal(latte.steps[1].phase, "grinding");
  assert.deepEqual(latte.steps[1].focus, ["hopper", "grinder"]);
  assert.equal(latte.steps[1].effects.grinderSpin, true);
  assert.equal(latte.steps[3].phase, "closing");
  assert.equal(latte.steps[5].motionProgress, 1);
  assert.equal(latte.steps[6].phase, undefined);
  assert.equal(latte.steps[6].motionHold, true);
  assert.equal(latte.steps.at(-3).phase, "opening");
  assert.equal(latte.steps.at(-2).phase, "ejecting");
  assert.equal(latte.steps.at(-1).phase, "scraping");
});

test("buildBrewScript handles Espresso and minimal default-valued recipes", () => {
  const espresso = buildBrewScript(parseProcedure(["DOSE:18", "TAMP:100", "EXTRACT:40"]), "Espresso");
  assert.equal(espresso.steps.some((step) => step.kind === "milk"), false);
  assert.equal(espresso.steps.find((step) => step.kind === "extract").valueText, "40 ml");

  const minimal = buildBrewScript(parseProcedure(["DOSE", "EXTRACT"]), "Minimal");
  assert.equal(minimal.steps.find((step) => step.kind === "grind").valueText, "18 g");
  assert.equal(minimal.steps.find((step) => step.kind === "extract").valueText, "40 ml");
  assert.equal(minimal.steps.filter((step) => ["open", "eject", "return"].includes(step.kind)).length, 3);
});

test("brew timing estimates stay clamped for unusual recipe values", () => {
  const short = buildBrewScript(parseProcedure(["DOSE:1", "EXTRACT:1"]), "Short");
  const long = buildBrewScript(parseProcedure(["DOSE:100", "EXTRACT:200"]), "Long");
  assert.equal(short.steps.find((step) => step.kind === "grind").durationMs, 1_200);
  assert.equal(short.steps.find((step) => step.kind === "extract").durationMs, 2_000);
  assert.equal(long.steps.find((step) => step.kind === "grind").durationMs, 4_000);
  assert.equal(long.steps.find((step) => step.kind === "extract").durationMs, 7_000);
});
