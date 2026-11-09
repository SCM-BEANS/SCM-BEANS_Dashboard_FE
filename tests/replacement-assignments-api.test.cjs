const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const passthrough = { parse: (value) => value };
const schemas = new Proxy({}, { get: () => passthrough });

function loadApi(axiosClient) {
  const fileName = join(__dirname, "../src/apis/replacement-assignments.api.ts");
  const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", outputText)((id) => {
    if (id === "@/lib/http") return { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" };
    if (id === "@/schema/contracts.schema" || id === "@/schema/machines.schema") return schemas;
    return (id === "@/lib/evidence-multipart" ? require("./evidence-multipart-helper.cjs") : require(id));
  }, loaded, loaded.exports);
  return loaded.exports.replacementAssignmentsApi;
}

const contractId = "00000000-0000-4000-8000-000000000001";
const assignmentId = "00000000-0000-4000-8000-000000000002";
const machineId = "00000000-0000-4000-8000-000000000003";

test("direct Contract replacement create, read, activation, cancel, and release use documented routes", async () => {
  const assignment = { id: assignmentId, contractId, replacementMachineId: machineId, primaryMachineId: machineId, status: "PLANNED" };
  const calls = [];
  const axiosClient = {
    get: async (url, config) => { calls.push({ method: "GET", url, config }); return { data: assignment }; },
    post: async (url, data, config) => {
      calls.push({ method: "POST", url, data, config });
      const status = url.includes("/contracts/") ? "PLANNED" : url.endsWith("/activate") ? "ACTIVE" : url.endsWith("/cancel") ? "CANCELLED" : "RELEASED";
      return { data: { ...assignment, status } };
    },
  };
  const api = loadApi(axiosClient);
  const create = { replacementMachineId: machineId, startAt: "2026-11-01T09:00", endAt: "2026-11-08T09:00", reason: "Repair coverage", idempotencyKey: "key-1", correlationId: "corr-1" };
  const activate = { approvalReason: "Approved", idempotencyKey: "key-2", correlationId: "corr-2" };
  const release = { idempotencyKey: "key-3", correlationId: "corr-3" };
  const cancel = { reason: "No longer required", idempotencyKey: "key-4", correlationId: "corr-4" };

  const files = [new File(["12345678"], "evidence.pdf", { type: "application/pdf" })];
  assert.equal((await api.create(contractId, create)).status, "PLANNED");
  assert.equal((await api.getById(assignmentId)).id, assignmentId);
  assert.equal((await api.activate(assignmentId, activate, files)).status, "ACTIVE");
  assert.equal((await api.cancel(assignmentId, cancel)).status, "CANCELLED");
  assert.equal((await api.release(assignmentId, release, files)).status, "RELEASED");
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ["POST", `/contracts/${contractId}/replacement-assignments`],
    ["GET", `/replacement-assignments/${assignmentId}`],
    ["POST", `/replacement-assignments/${assignmentId}/activate`],
    ["POST", `/replacement-assignments/${assignmentId}/cancel`],
    ["POST", `/replacement-assignments/${assignmentId}/release`],
  ]);
  assert.deepEqual(calls[0].data, create);
  for (const [index, data] of [[2, activate], [4, release]]) {
    assert.deepEqual(calls[index].config, { baseURL: "/api/dolores/v1", headers: { "Content-Type": "multipart/form-data" } });
    assert.deepEqual(JSON.parse(await calls[index].data.get("data").text()), data);
    assert.deepEqual(calls[index].data.getAll("files"), files);
    assert.deepEqual([...calls[index].data.keys()], ["data", "files"]);
  }
  assert.deepEqual(calls[3].data, cancel);
});

test("replacement methods reject a mismatched server response", async () => {
  const api = loadApi({
    post: async () => ({ data: { id: assignmentId, contractId, replacementMachineId: machineId, primaryMachineId: machineId, status: "CANCELLED" } }),
    get: async () => ({ data: { id: contractId, contractId, replacementMachineId: machineId, primaryMachineId: machineId, status: "PLANNED" } }),
  });
  await assert.rejects(api.create(contractId, { replacementMachineId: machineId, startAt: "2026-11-01T09:00", endAt: "2026-11-08T09:00", reason: "Repair coverage", idempotencyKey: "key", correlationId: "corr" }), /did not confirm/);
  await assert.rejects(api.getById(assignmentId), /different replacement assignment/);
});
