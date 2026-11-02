const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const passthrough = { parse: (value) => value };
const schemaMocks = new Proxy({}, {
  get: (_target, property) => property === "RepairCaseSchema" ? { shape: { id: passthrough } } : passthrough,
});

function loadTypeScriptModule(relativePath, mocks = {}) {
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
const differentId = "00000000-0000-4000-8000-000000000003";

test("RepairCase diagnosis posts documented body and accepts only the matching assigned ticket", async () => {
  const calls = [];
  const request = {
    diagnosis: "Pump seal is worn",
    evidenceReference: "private/repair/diagnosis-01.jpg",
  };
  const ticket = { id: ticketId, repairCaseId: caseId, status: "ASSIGNED", diagnosis: request.diagnosis };
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

  assert.deepEqual(await repairCasesApi.recordDiagnosis(caseId, ticketId, request), ticket);
  assert.deepEqual(calls[0], {
    url: `/repair-cases/${caseId}/diagnosis`,
    data: request,
    config: { baseURL: "/api/dolores/v1" },
  });
});

test("RepairCase diagnosis rejects a response for another case, ticket, or status", async () => {
  let responseData = { id: ticketId, repairCaseId: caseId, status: "ASSIGNED", diagnosis: "Pump seal is worn" };
  const axiosClient = { post: async () => ({ data: responseData }) };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });
  const request = { diagnosis: "Pump seal is worn", evidenceReference: "private/repair/diagnosis-01.jpg" };

  responseData = { ...responseData, id: differentId };
  await assert.rejects(repairCasesApi.recordDiagnosis(caseId, ticketId, request), /expected assigned ticket/);
  responseData = { ...responseData, id: ticketId, repairCaseId: differentId };
  await assert.rejects(repairCasesApi.recordDiagnosis(caseId, ticketId, request), /expected assigned ticket/);
  responseData = { ...responseData, repairCaseId: caseId, status: "IN_PROGRESS" };
  await assert.rejects(repairCasesApi.recordDiagnosis(caseId, ticketId, request), /expected assigned ticket/);
});

test("RepairCase work completion posts all required fields and accepts only the resolved linked ticket", async () => {
  const calls = [];
  const request = {
    diagnosis: "Pump seal is worn",
    resolutionResult: "Replaced seal and verified flow",
    workScope: "Replace the pump seal",
    evidenceReferences: ["private/repair/completion-01.jpg"],
    notes: "No leak during final check",
  };
  const ticket = { id: ticketId, repairCaseId: caseId, status: "RESOLVED" };
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

  assert.deepEqual(await repairCasesApi.completeWork(caseId, ticketId, request), ticket);
  assert.deepEqual(calls[0], {
    url: `/repair-cases/${caseId}/work/complete`,
    data: request,
    config: { baseURL: "/api/dolores/v1" },
  });
});

test("RepairCase work completion rejects a response unless the linked ticket is resolved", async () => {
  let responseData = { id: ticketId, repairCaseId: caseId, status: "IN_PROGRESS" };
  const axiosClient = { post: async () => ({ data: responseData }) };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });
  const request = {
    diagnosis: "Pump seal is worn",
    resolutionResult: "Replaced seal",
    workScope: "Replace the seal",
    evidenceReferences: ["private/repair/completion-01.jpg"],
  };

  await assert.rejects(repairCasesApi.completeWork(caseId, ticketId, request), /expected RepairCase ticket/);
  responseData = { ...responseData, id: differentId, status: "RESOLVED" };
  await assert.rejects(repairCasesApi.completeWork(caseId, ticketId, request), /expected RepairCase ticket/);
  responseData = { ...responseData, id: ticketId, repairCaseId: differentId };
  await assert.rejects(repairCasesApi.completeWork(caseId, ticketId, request), /expected RepairCase ticket/);
});

test("RepairCase diagnosis and completion evidence require private references", () => {
  const { RepairDiagnosisRequestSchema, RepairWorkCompletionRequestSchema } =
    loadTypeScriptModule("src/schema/machines.schema.ts");

  assert.equal(RepairDiagnosisRequestSchema.parse({
    diagnosis: "Pump seal is worn",
    evidenceReference: "private/repair/diagnosis-01.jpg",
  }).diagnosis, "Pump seal is worn");
  assert.throws(() => RepairDiagnosisRequestSchema.parse({
    diagnosis: "Pump seal is worn",
    evidenceReference: "https://public.example/diagnosis.jpg",
  }));
  assert.throws(() => RepairDiagnosisRequestSchema.parse({
    diagnosis: "Pump seal is worn",
    evidenceReference: "private/repair/diagnosis-01.jpg\nprivate/repair/diagnosis-02.jpg",
  }));

  const completion = {
    diagnosis: "Pump seal is worn",
    resolutionResult: "Replaced seal",
    workScope: "Replace the seal",
    evidenceReferences: ["private/repair/completion-01.jpg"],
  };
  assert.equal(RepairWorkCompletionRequestSchema.parse(completion).evidenceReferences.length, 1);
  assert.throws(() => RepairWorkCompletionRequestSchema.parse({ ...completion, evidenceReferences: [] }));
  assert.throws(() => RepairWorkCompletionRequestSchema.parse({
    ...completion,
    evidenceReferences: ["https://public.example/completion.jpg"],
  }));
});

test("Technician actions remain in ordered workflow steps and require the server prerequisites", () => {
  const source = readFileSync(join(__dirname, "../src/components/features/repair-workflow/repair-case-detail-screen.tsx"), "utf8");
  assert.match(source, /const canRecordDiagnosis = role === "technician"/);
  assert.match(source, /repairCase\.data\?\.status === "REPLACEMENT_DELIVERED"/);
  assert.match(source, /replacementDeliveryAcknowledged/);
  assert.match(source, /const canStartWork = isAssignedTechnician/);
  assert.match(source, /repairCase\.data\?\.status === "DIAGNOSIS"/);
  assert.match(source, /ticket\.data\?\.status === "ASSIGNED"/);
  assert.match(source, /const canCompleteWork = role === "technician"/);
  assert.match(source, /repairCase\.data\?\.status === "REPAIR_IN_PROGRESS"/);
  assert.match(source, /ticket\.data\?\.status === "IN_PROGRESS"/);
  assert.match(source, /replacementAssignmentIdFromTimeline\(timeline\.data\?\.content \?\? \[\]\)/);
  assert.match(source, /eventType === "REPLACEMENT_PLANNED"/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_DIAGNOSIS\}/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_START_REPAIR\}/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_COMPLETE_REPAIR\}/);
  assert.doesNotMatch(source, /aria-label=\{M\.TECHNICIAN_ACTIONS\}/);
  assert.match(source, /\.replace\(\/;evidence=\[\\s\\S\]\*\$\/i, ""\)/);
});
