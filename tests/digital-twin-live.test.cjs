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

const messages = loadTypescript("src/text/digital-twin/digital-twin-messages.ts").DIGITAL_TWIN_LIVE_MESSAGES;
const { mapBrewState, LIVE_BREW_STEPS } = loadTypescript(
  "src/components/features/digital-twin/live/brew-state-mapping.ts",
  { "@/text/digital-twin/digital-twin-messages": { DIGITAL_TWIN_LIVE_MESSAGES: messages } },
);

const mappingCases = [
  ["IDLE", "idle", null, "digital_twin_live_state_idle", false],
  ["UNKNOWN", "idle", null, "digital_twin_live_state_unknown", false],
  ["UNSPECIFIED", "idle", null, "digital_twin_live_state_unknown", false],
  ["CHECKING_TEMPERATURE", "idle", "heating", "digital_twin_live_state_checking_temperature", false],
  ["HEATING", "idle", "heating", "digital_twin_live_state_heating", false],
  ["CHECKING_ERRORS", "idle", "heating", "digital_twin_live_state_checking_errors", false],
  ["GRINDING", "grinding", "grinding", "digital_twin_live_state_grinding", false],
  ["CLOSE_CHAMBER_LID", "closing", "closing", "digital_twin_live_state_close_chamber_lid", false],
  ["TAMPING_ACCORDING_TO_RECIPE", "tamping", "tamping", "digital_twin_live_state_tamping", false],
  ["DRY_TAMP", "tamping", "tamping", "digital_twin_live_state_dry_tamp", false],
  ["PRE_INFUSION", "extraction", "extraction", "digital_twin_live_state_pre_infusion", false],
  ["MAIN_EXTRACTION", "extraction", "extraction", "digital_twin_live_state_main_extraction", false],
  ["OPEN_CHAMBER_LID", "opening", "opening", "digital_twin_live_state_open_chamber_lid", false],
  ["EJECT_GROUNDS_1", "ejecting", "ejecting", "digital_twin_live_state_eject_grounds", false],
  ["EJECT_GROUNDS_2", "ejecting", "ejecting", "digital_twin_live_state_eject_grounds", false],
  ["RETURN_TO_NEUTRAL_1", "scraping", "returning", "digital_twin_live_state_return_to_neutral", false],
  ["RETURN_TO_NEUTRAL_2", "scraping", "returning", "digital_twin_live_state_return_to_neutral", false],
  ["RETURN_TO_NEUTRAL_3", "scraping", "returning", "digital_twin_live_state_return_to_neutral", false],
  ["STARTING_MILK", "idle", "milk", "digital_twin_live_state_starting_milk", false],
  ["WAITING_FOR_MILK", "idle", "milk", "digital_twin_live_state_waiting_for_milk", false],
  ["COMPLETE", "complete", "done", "digital_twin_live_state_complete", false],
  ["ERROR", "fault", null, "digital_twin_live_state_error", true],
];

test("mapBrewState maps every machine state in prefixed and unprefixed forms", () => {
  for (const [state, phase, step, labelKey, fault] of mappingCases) {
    for (const raw of [state, `BREW_STATE_${state}`]) {
      assert.deepEqual(mapBrewState(raw), {
        key: state,
        label: messages[labelKey],
        phase,
        step,
        fault,
      }, `${raw} should map to ${phase}/${step}`);
    }
  }
});

test("mapBrewState treats absent and unrecognized states as unknown", () => {
  for (const raw of [null, undefined, "", "UNKNOWN_VALUE", "BREW_STATE_UNKNOWN_VALUE"]) {
    const result = mapBrewState(raw);
    assert.equal(result.label, messages.digital_twin_live_state_unknown);
    assert.equal(result.phase, "idle");
    assert.equal(result.step, null);
    assert.equal(result.fault, false);
  }
  assert.equal(mapBrewState(null).key, "UNKNOWN");
  assert.equal(mapBrewState("BREW_STATE_UNKNOWN_VALUE").key, "UNKNOWN_VALUE");
});

test("live step labels stay in operation order", () => {
  assert.deepEqual(LIVE_BREW_STEPS, [
    { key: "heating", label: messages.digital_twin_live_steps_heating },
    { key: "grinding", label: messages.digital_twin_live_steps_grinding },
    { key: "closing", label: messages.digital_twin_live_steps_closing },
    { key: "tamping", label: messages.digital_twin_live_steps_tamping },
    { key: "extraction", label: messages.digital_twin_live_steps_extraction },
    { key: "opening", label: messages.digital_twin_live_steps_opening },
    { key: "ejecting", label: messages.digital_twin_live_steps_ejecting },
    { key: "returning", label: messages.digital_twin_live_steps_returning },
    { key: "done", label: messages.digital_twin_live_steps_done },
  ]);
});
