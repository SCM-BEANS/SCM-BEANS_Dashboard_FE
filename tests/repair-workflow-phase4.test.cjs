const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const passthrough = { parse: (value) => value };
const schemaMocks = new Proxy({}, { get: () => passthrough });

function loadTypeScriptModule(relativePath, mocks) {
  const fileName = join(__dirname, "..", relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const loaded = { exports: {} };
  const mockedRequire = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", outputText)(mockedRequire, loaded, loaded.exports);
  return loaded.exports;
}

const caseId = "00000000-0000-4000-8000-000000000001";
const ticketId = "00000000-0000-4000-8000-000000000002";
const ticket = { id: ticketId, repairCaseId: caseId, status: "IN_PROGRESS" };

test("Technician work start sends only workScope and validates the returned ticket", async () => {
  const calls = [];
  const axiosClient = {
    post: async (url, data, config) => {
      calls.push({ url, data, config });
      return { data: ticket };
    },
  };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });

  assert.deepEqual(await repairCasesApi.startWork(caseId, ticketId, { workScope: "Replace the drive belt." }), ticket);
  assert.deepEqual(calls[0], {
    url: `/repair-cases/${caseId}/work/start`,
    data: { workScope: "Replace the drive belt." },
    config: { baseURL: "/api/dolores/v1" },
  });
});

test("Technician work start rejects a response for another ticket or case state", async () => {
  let responseData = { ...ticket, id: caseId };
  const axiosClient = { post: async () => ({ data: responseData }) };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });

  await assert.rejects(repairCasesApi.startWork(caseId, ticketId, { workScope: "Inspect." }), /did not confirm/);
  responseData = { ...ticket, repairCaseId: ticketId };
  await assert.rejects(repairCasesApi.startWork(caseId, ticketId, { workScope: "Inspect." }), /did not confirm/);
  responseData = { ...ticket, status: "ASSIGNED" };
  await assert.rejects(repairCasesApi.startWork(caseId, ticketId, { workScope: "Inspect." }), /did not confirm/);
});

test("Technician diagnosis, start, and completion are gated in the ordered workflow steps", () => {
  const source = readFileSync(join(__dirname, "../src/components/features/repair-workflow/repair-case-detail-screen.tsx"), "utf8");
  assert.match(source, /ticket\.data\?\.assignedTechnicianId\?\.toLowerCase\(\) === currentSubjectId\.toLowerCase\(\)/);
  assert.match(source, /const canRecordDiagnosis = role === "technician"/);
  assert.match(source, /repairCase\.data\?\.status === "REPLACEMENT_DELIVERED"/);
  assert.match(source, /repairCasesApi\.recordDiagnosis\(caseId, expectedTicketId, \{ diagnosis, evidenceReference \}\)/);
  assert.match(source, /const canStartWork = isAssignedTechnician/);
  assert.match(source, /repairCase\.data\?\.status === "DIAGNOSIS"/);
  assert.match(source, /ticket\.data\?\.status === "ASSIGNED"/);
  assert.match(source, /replacementDeliveryAcknowledged/);
  assert.match(source, /repairCasesApi\.startWork\(caseId, expectedTicketId, \{ workScope \}\)/);
  assert.match(source, /const canCompleteWork = role === "technician"/);
  assert.match(source, /repairCase\.data\?\.status === "REPAIR_IN_PROGRESS"/);
  assert.match(source, /ticket\.data\?\.status === "IN_PROGRESS"/);
  assert.match(source, /repairCasesApi\.completeWork\(caseId, expectedTicketId, request\)/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_DIAGNOSIS\}/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_START_REPAIR\}/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_COMPLETE_REPAIR\}/);
  assert.doesNotMatch(source, /aria-label=\{M\.TECHNICIAN_ACTIONS\}/);
  assert.match(source, /emergencyAuthorizationId:/);
});
