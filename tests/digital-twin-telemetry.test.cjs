const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function load(path, mocks = {}) {
  const fileName = join(__dirname, "..", path);
  const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), { fileName, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const loaded = { exports: {} };
  new Function("require", "exports", "module", outputText)(id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), loaded.exports, loaded);
  return loaded.exports;
}
const polling = load("src/components/machines/machine-heartbeat-visibility.ts");
const messages = load("src/text/digital-twin/digital-twin-messages.ts");
const parts = load("src/components/features/digital-twin/presentation/part-groups.ts");
const { recentLiveHeartbeat, selectLiveHeartbeat, liveBrewView, liveHeartbeatConnected, telemetryMetrics } = load("src/components/features/digital-twin/live/use-live-brew-state.ts", {
  "@/components/machines/machine-heartbeat-visibility": polling,
  "@/text/digital-twin/digital-twin-messages": messages, "../presentation/part-groups": parts,
});
const { DigitalTwinCycleEventSchema } = load("src/schema/digital-twin-cycle.schema.ts");
const machineId = "00000000-0000-4000-8000-000000000001";
const now = Date.parse("2026-11-16T05:00:00Z");
function heartbeat(state, sequenceNumber = 1, age = 0) { return { machineId, status: "ONLINE", brewState: `BREW_STATE_${state}`, sequenceNumber, lastSeenAt: new Date(now - age).toISOString(), metricsJson: { recipe_id: "espresso", recipe_name: "Espresso", recipe_step: 3, simulated: false } }; }

test("device stages select viewer phases and hold until a new device state arrives", () => {
  let accepted = null;
  const expected = [ ["GRINDING", "grinding"], ["CLOSE_CHAMBER_LID", "closing"], ["TAMPING_ACCORDING_TO_RECIPE", "tamping"], ["PRE_INFUSION", "extraction"], ["MAIN_EXTRACTION", "extraction"], ["DRY_TAMP", "tamping"], ["OPEN_CHAMBER_LID", "opening"], ["EJECT_GROUNDS_2", "ejecting"], ["RETURN_TO_NEUTRAL_3", "scraping"], ["COMPLETE", "complete"] ];
  for (const [index, [state, phase]] of expected.entries()) {
    accepted = selectLiveHeartbeat(accepted, heartbeat(state, index + 1), machineId, now);
    const view = liveBrewView(accepted);
    assert.equal(view.state, state);
    assert.equal(view.event.phase, phase);
    assert.equal(view.event.sequence, index + 1);
    assert.equal(view.recipeName, "Espresso");
    assert.equal(DigitalTwinCycleEventSchema.safeParse(view.event).success, true);
    const repeated = selectLiveHeartbeat(accepted, accepted, machineId, now + 5000);
    assert.equal(repeated, accepted, "elapsed browser time does not select the next step");
    assert.deepEqual(liveBrewView(repeated), view);
  }
});

test("joining mid-extraction establishes a closed/tamped schematic pose without replaying earlier steps", () => {
  const view = liveBrewView(heartbeat("MAIN_EXTRACTION", 700));
  assert.deepEqual(view.presentation.mechanismPose, { main: 1, lower: .5 });
  assert.deepEqual(view.presentation.effects, { water: true, coffee: true });
  assert.equal(view.event.sequence, 700);
  const preinfusion = liveBrewView(heartbeat("PRE_INFUSION"));
  assert.deepEqual(preinfusion.presentation.effects, { water: true });
});

test("measurement time orders packets and a new cycle may restart its sequence", () => {
  const previous = heartbeat("COMPLETE", 700, 1000);
  const restarted = heartbeat("GRINDING", 1);
  assert.equal(selectLiveHeartbeat(previous, restarted, machineId, now), restarted);
  assert.equal(selectLiveHeartbeat(restarted, previous, machineId, now), restarted);
  assert.equal(selectLiveHeartbeat(restarted, { ...restarted, sequenceNumber: 0 }, machineId, now), restarted);
  const late = { ...heartbeat("COMPLETE", 800), deviceReportedAt: new Date(now-2000).toISOString() };
  const current = { ...restarted, deviceReportedAt: new Date(now-1000).toISOString() };
  assert.equal(selectLiveHeartbeat(current, late, machineId, now), current);
});

test("brief extraction gaps retain the step without claiming online or emitting particles", () => {
  const last = heartbeat("MAIN_EXTRACTION", 22, 15000);
  assert.equal(recentLiveHeartbeat(last, machineId, now), true);
  const view = liveBrewView(last, false);
  assert.equal(view.state, "MAIN_EXTRACTION");
  assert.equal(view.event.phase, "extraction");
  assert.equal(view.active, false);
  assert.deepEqual(view.presentation.effects, {});
  assert.equal(view.presentation.holdMechanism, true);
  assert.equal(view.presentation.label, undefined, "live text belongs in the side panel, not on the model");
  const resumed = heartbeat("DRY_TAMP", 23);
  assert.equal(selectLiveHeartbeat(last, resumed, machineId, now), resumed);
});

test("expired, missing, wrong-machine or invalid-time snapshots cannot drive the model", () => {
  for (const data of [undefined, { ...heartbeat("GRINDING"), machineId: "other" }, { ...heartbeat("GRINDING"), lastSeenAt: "invalid" }]) {
    assert.equal(recentLiveHeartbeat(data, machineId, now), false);
    const view = liveBrewView(selectLiveHeartbeat(null, data, machineId, now));
    assert.equal(view.event, null);
    assert.deepEqual(view.presentation.effects, {});
    assert.equal(view.presentation.holdMechanism, true);
  }
});

test("JSON metrics, fallback FSM states, unknown phases and faults stay explicit", () => {
  const data = heartbeat("UNSPECIFIED");
  data.metricsJson = JSON.stringify({ fsm_state: "GRINDING", recipe_step: 4, recipe_id: "espresso", simulated: true });
  const view = liveBrewView(data);
  assert.equal(view.state, "GRINDING");
  assert.equal(view.recipeStep, 4);
  assert.equal(view.simulated, true);
  assert.equal(liveBrewView({ ...data, brewState: "BREW_STATE_FUTURE" }).event, null);
  const fault = liveBrewView({ ...heartbeat("MAIN_EXTRACTION"), metricsJson: { error_code: 3 } });
  assert.equal(fault.event.phase, "fault");
  assert.deepEqual(fault.presentation.effects, {});
  assert.equal(fault.presentation.holdMechanism, true);
  for (const value of ["invalid", "null", "[]", null]) assert.deepEqual(telemetryMetrics(value), {});
  assert.equal(liveBrewView({ ...heartbeat("GRINDING"), metricsJson: { recipe_step: {} } }).recipeStep, null);
});

test("all documented FSM states are recognized without assuming the unobserved steps completed", () => {
  for (const state of Object.keys(messages.DIGITAL_TWIN_LIVE_STATE_LABELS)) {
    assert.equal(liveBrewView(heartbeat(state)).state, state);
  }
  for (const state of ["HEATING", "STARTING_MILK", "WAITING_FOR_MILK", "CHECKING_ERRORS"]) {
    assert.deepEqual(liveBrewView(heartbeat(state)).presentation.effects, {});
  }
});
const THREE = require('three');
const waterRuntime = load('src/components/features/digital-twin/material-effects/waterFlowRuntime.ts');
const coffeeRuntime = load('src/components/features/digital-twin/material-effects/coffeeGroundRuntime.ts');
test('live particles keep flowing past ten seconds while timed simulation stops', () => {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial(), 1);
  const config = { durationMs: 10000, particleTravelDurationMs: 2600 };
  const water = { mesh, config, progress: 1, elapsedMs: 20100, particles: [{ branchIndex: 0, emissionOffset: 0, lateralOffset: [0, 0], phase: 0, scale: 1, rotation: 0 }], branches: [{ start: new THREE.Vector3(), end: new THREE.Vector3(0,-1,0) }], scratch: waterRuntime.createWaterFlowRuntimeScratch() };
  waterRuntime.updateWaterFlowInstances(water);
  assert.equal(mesh.visible, false);
  waterRuntime.updateWaterFlowInstances({ ...water, continuous: true });
  assert.equal(mesh.visible, true);
  waterRuntime.clearWaterFlowInstances(mesh);
  assert.equal(mesh.visible, false);
  const coffee = { mesh, effect: { ...config, dischargeDirection: [0,-1,0], targetOffset: [0,-1,0], gravity: 1 }, progress: 1, elapsedMs: 20100, particles: [{ spawnOffset: [0,0,0], targetOffset: [0,0,0], emissionOffset: 0, scale: 1, rotation: [0,0,0], drift: [0,0] }], anchorPosition: new THREE.Vector3(), anchorQuaternion: new THREE.Quaternion(), scratch: coffeeRuntime.createCoffeeGroundRuntimeScratch() };
  coffeeRuntime.updateCoffeeGroundInstances(coffee);
  assert.equal(mesh.visible, false);
  coffeeRuntime.updateCoffeeGroundInstances({ ...coffee, continuous: true });
  assert.equal(mesh.visible, true);
  coffeeRuntime.clearCoffeeGroundInstances(mesh);
  assert.equal(mesh.visible, false);
  assert.equal(liveBrewView(heartbeat('MAIN_EXTRACTION')).presentation.continuousEffects, true);
  assert.equal(liveBrewView(null).presentation.continuousEffects, false);
  mesh.geometry.dispose(); mesh.material.dispose();
});

test("connection follows newest liveness, not the age of a rejected brewing snapshot", () => {
  const accepted = heartbeat("COMPLETE", 100, 15000);
  const incoming = { ...heartbeat("GRINDING", 99), evaluatedAt: new Date(now).toISOString(), deviceReportedAt: accepted.lastSeenAt };
  assert.equal(selectLiveHeartbeat(accepted, incoming, machineId, now), accepted);
  assert.equal(liveHeartbeatConnected(incoming, machineId, now), true);
  assert.equal(liveBrewView(accepted, false).active, false);
  assert.equal(liveHeartbeatConnected({ ...incoming, status: "OFFLINE" }, machineId, now), false);
  assert.equal(liveHeartbeatConnected(incoming, machineId, now, new Error("temporary failure")), false);
});
test("completed brews keep their connection as fresh heartbeats continue", () => {
  let accepted = heartbeat("COMPLETE", 500);
  for (let i = 1; i <= 40; i++) {
    const time = now + i * 2000;
    const incoming = { ...heartbeat("COMPLETE", 500+i), lastSeenAt: new Date(time).toISOString(), deviceReportedAt: new Date(time+785).toISOString() };
    accepted = selectLiveHeartbeat(accepted, incoming, machineId, time);
    assert.equal(liveHeartbeatConnected(incoming, machineId, time), true);
    assert.equal(liveBrewView(accepted).state, "COMPLETE");
  }
});

test("server ONLINE can remain valid while brewing measurements pause after completion", () => {
  const completed = { ...heartbeat("COMPLETE", 1445, 60000), evaluatedAt: new Date(now).toISOString() };
  assert.equal(liveHeartbeatConnected(completed, machineId, now), true);
  const snapshot = selectLiveHeartbeat(null, completed, machineId, now);
  const view = liveBrewView(snapshot, false);
  assert.equal(view.state, "COMPLETE");
  assert.equal(view.active, false);
  assert.deepEqual(view.presentation.effects, {});
  assert.equal(liveHeartbeatConnected(completed, machineId, now + 11000), false, "an expired API evaluation must not imply online forever");
  assert.equal(liveHeartbeatConnected({ ...completed, status: "OFFLINE" }, machineId, now), false);
});


test("polling backs off consecutive failures and returns to normal immediately on success", () => {
  for (const normal of [1000, 5000, 15000]) {
    const query = { state: { error: new TypeError('fetch failed'), errorUpdateCount: 1, dataUpdatedAt: 1 } };
    const intervals = [];
    for (let i = 1; i <= 5; i++) {
      query.state.errorUpdateCount = i;
      intervals.push(polling.pollingInterval(query, normal));
      assert.equal(polling.pollingInterval(query, normal), intervals.at(-1), 're-evaluation does not count another failure');
    }
    if (normal === 1000) assert.deepEqual(intervals, [2000, 5000, 10000, 10000, 10000]);
    else assert.ok(intervals[0] > normal);
    if (normal <= 5000) assert.ok(intervals.every(interval => interval <= 10000));
    query.state.error = null; query.state.dataUpdatedAt++;
    assert.equal(polling.pollingInterval(query, normal), normal);
    query.state.error = new TypeError('next outage'); query.state.errorUpdateCount++;
    assert.equal(polling.pollingInterval(query, normal), intervals[0]);
    for (const status of [403, 404]) {
      query.state.error = { response: { status } };
      assert.ok(polling.pollingInterval(query, normal) >= 15000);
    }
  }
});

test("brief network/502/504 errors keep the observed step fresh until liveness expires", () => {
  const packet = { ...heartbeat('MAIN_EXTRACTION'), evaluatedAt: new Date(now).toISOString() };
  for (const error of [new TypeError('fetch failed'), { isAxiosError: true }, { response: { status: 502 } }, { response: { status: 504 } }]) {
    assert.equal(polling.isTemporaryTelemetryError(error), true);
    const fresh = liveHeartbeatConnected(packet, machineId, now + 5000, error);
    assert.equal(fresh, true);
    const view = liveBrewView(packet, fresh);
    assert.equal(view.state, 'MAIN_EXTRACTION');
    assert.equal(view.active, true);
    assert.equal(view.presentation.holdMechanism, false);
    assert.equal(liveHeartbeatConnected(packet, machineId, now + 10001, error), false);
    assert.equal(liveHeartbeatConnected({ ...packet, status: 'OFFLINE' }, machineId, now, error), false);
  }
  assert.equal(liveHeartbeatConnected(packet, machineId, now, { response: { status: 403 } }), false);
  assert.equal(messages.MACHINE_RECONNECTING_LABEL, '\u0110ang k\u1ebft n\u1ed1i l\u1ea1i\u2026');
});
