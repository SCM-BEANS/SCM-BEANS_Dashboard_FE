const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const passthrough = { parse: (value) => value };
const schemaMocks = new Proxy({}, { get: () => passthrough });

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
const requestId = "00000000-0000-4000-8000-000000000002";
const machineId = "00000000-0000-4000-8000-000000000003";
const eventId = "00000000-0000-4000-8000-000000000004";
const assignmentId = "00000000-0000-4000-8000-000000000005";

test("RepairCase custody creation sends the documented body and checks returned event identity", async () => {
  const calls = [];
  const request = {
    eventType: "REPLACEMENT_COLLECTED",
    machineId,
    conditionNotes: "Machine returned after repair.",
    evidenceReference: "private://custody/record-05",
  };
  const event = {
    ...request,
    id: eventId,
    maintenanceRequestId: requestId,
    repairCaseId: caseId,
    actorId: assignmentId,
    actorRole: "TECHNICIAN",
    occurredAt: "2026-10-31T09:00:00Z",
  };
  const axiosClient = {
    post: async (url, data, config) => {
      calls.push({ url, data, config });
      return { data: event };
    },
  };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });

  assert.deepEqual(await repairCasesApi.recordCustodyEvent(caseId, request), event);
  assert.deepEqual(calls[0], {
    url: `/repair-cases/${caseId}/custody-events`,
    data: request,
    config: { baseURL: "/api/dolores/v1" },
  });
});

test("RepairCase custody creation rejects a response that changes case, event type, or machine", async () => {
  const request = {
    eventType: "PRIMARY_RETURNED",
    machineId,
    conditionNotes: "Primary machine returned.",
    evidenceReference: "private://custody/record-06",
  };
  let responseData = {
    ...request,
    id: eventId,
    maintenanceRequestId: requestId,
    repairCaseId: requestId,
    actorRole: "ADMIN",
    occurredAt: "2026-10-31T09:00:00Z",
  };
  const axiosClient = { post: async () => ({ data: responseData }) };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });

  await assert.rejects(repairCasesApi.recordCustodyEvent(caseId, request), /different RepairCase custody event/);
  responseData = { ...responseData, repairCaseId: caseId, eventType: "REPLACEMENT_COLLECTED" };
  await assert.rejects(repairCasesApi.recordCustodyEvent(caseId, request), /different RepairCase custody event/);
  responseData = { ...responseData, eventType: request.eventType, machineId: requestId };
  await assert.rejects(repairCasesApi.recordCustodyEvent(caseId, request), /different RepairCase custody event/);
});

test("Replacement assignment release sends idempotency fields and checks RELEASED response", async () => {
  const calls = [];
  let responseData = { id: assignmentId, status: "RELEASED" };
  const request = {
    releaseEvidence: "private://release/record-07",
    idempotencyKey: "repair-closeout-7f82b7f9",
    correlationId: "correlation-5ef0aa7c",
  };
  const axiosClient = {
    post: async (url, data, config) => {
      calls.push({ url, data, config });
      return { data: responseData };
    },
  };
  const { replacementAssignmentsApi } = loadTypeScriptModule("src/apis/replacement-assignments.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/contracts.schema": schemaMocks,
    "@/schema/machines.schema": schemaMocks,
  });

  assert.deepEqual(await replacementAssignmentsApi.release(assignmentId, request), responseData);
  assert.deepEqual(calls[0], {
    url: `/replacement-assignments/${assignmentId}/release`,
    data: request,
    config: { baseURL: "/api/dolores/v1" },
  });
  responseData = { id: assignmentId, status: "ACTIVE" };
  await assert.rejects(replacementAssignmentsApi.release(assignmentId, request), /did not confirm/);
});

test("Private evidence schemas reject public URLs and line breaks", () => {
  const { MaintenanceCustodyEventCreateRequestSchema, ReplacementAssignmentReleaseRequestSchema } =
    loadTypeScriptModule("src/schema/machines.schema.ts");

  const custodyRequest = {
    eventType: "PRIMARY_RETURNED",
    machineId,
    conditionNotes: "Primary returned after repair.",
    evidenceReference: "private://custody/return-1",
  };
  assert.equal(MaintenanceCustodyEventCreateRequestSchema.parse(custodyRequest).eventType, "PRIMARY_RETURNED");
  assert.throws(() => MaintenanceCustodyEventCreateRequestSchema.parse({ ...custodyRequest, evidenceReference: "https://public.example/evidence" }));
  assert.throws(() => MaintenanceCustodyEventCreateRequestSchema.parse({ ...custodyRequest, evidenceReference: "private://one\nprivate://two" }));
  assert.throws(() => ReplacementAssignmentReleaseRequestSchema.parse({
    releaseEvidence: "https://public.example/release",
    idempotencyKey: "key",
    correlationId: "correlation",
  }));
});

test("Phase 4 return steps use the correct machine, role, order, and Owner acknowledgments", () => {
  const source = readFileSync(join(__dirname, "../src/components/features/repair-workflow/repair-case-detail-screen.tsx"), "utf8");
  assert.match(source, /canCollectReplacement = repairCase\.isSuccess && !repairCase\.isFetching/);
  assert.match(source, /repairCase\.data\?\.status === "REPAIR_COMPLETED" && ticket\.data\?\.status === "RESOLVED"/);
  assert.match(source, /canReturnPrimary = repairCase\.isSuccess && !repairCase\.isFetching/);
  assert.match(source, /repairCase\.data\?\.status === "REPLACEMENT_COLLECTED" && ticket\.data\?\.status === "RESOLVED"/);
  assert.match(source, /input\.eventType === "REPLACEMENT_COLLECTED"[\s\S]*Boolean\(replacementDeliveredEvent\?\.ownerAcknowledgedAt\)[\s\S]*replacementDeliveredEvent\?\.machineId === assignment\.data\?\.replacementMachineId[\s\S]*!replacementCollectionEvent/);
  assert.match(source, /input\.eventType === "PRIMARY_RETURNED"[\s\S]*Boolean\(replacementCollectionEvent\?\.ownerAcknowledgedAt\)[\s\S]*replacementCollectionEvent\?\.machineId === assignment\.data\?\.replacementMachineId[\s\S]*assignment\.data\?\.primaryMachineId === repairCase\.data\?\.primaryMachineId[\s\S]*!primaryReturnEvent/);
  assert.match(source, /machineId = assignment\.data\?\.replacementMachineId/);
  assert.match(source, /machineId = repairCase\.data\?\.primaryMachineId/);
  assert.match(source, /assignment\.data\.replacementMachineId !== repairCase\.data\.primaryMachineId/);
  assert.match(source, /assignment\.data\.primaryMachineId === repairCase\.data\.primaryMachineId/);
  assert.match(source, /canReleaseReplacement = repairCase\.isSuccess && !repairCase\.isFetching[\s\S]*repairCase\.data\?\.status === "OWNER_ACKNOWLEDGED"/);
  assert.match(source, /role === "admin" \|\| role === "moderator" \|\| \(role === "technician" && isAssignedTechnician\)/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_REPLACEMENT_COLLECTION\}/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_REPLACEMENT_COLLECTION_ACKNOWLEDGMENT\}/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_PRIMARY_RETURN\}/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_PRIMARY_RETURN_ACKNOWLEDGMENT\}/);
  assert.match(source, /primaryReturnAcknowledged &&\s*\["OWNER_ACKNOWLEDGED", "CLOSED"\]\.includes\(repairCase\.data\?\.status \?\? ""\)/);
  assert.match(source, /primaryReturnEvent \? role === "owner" && !primaryReturnAcknowledged \? "current" : "waiting"/);
  assert.match(source, /M\.PRIMARY_RETURN_STATUS_SYNC_PENDING/);
  assert.match(source, /renderOwnerAcknowledgment\(replacementCollectionEvent, M\.ACKNOWLEDGMENT_REPLACEMENT_COLLECTED_PROMPT\)/);
  assert.match(source, /renderOwnerAcknowledgment\(primaryReturnEvent, M\.ACKNOWLEDGMENT_PRIMARY_RETURNED_PROMPT\)/);
  assert.match(source, /eventType: "REPLACEMENT_COLLECTED", machineId, conditionNotes, evidenceReference/);
  assert.match(source, /eventType: "PRIMARY_RETURNED", machineId, conditionNotes, evidenceReference/);
  assert.doesNotMatch(source, /privateEvidenceStepBlocked/);
});

test("Phase 5 release requires the acknowledged case state, confirmation, idempotency, and read-after-write", () => {
  const source = readFileSync(join(__dirname, "../src/components/features/repair-workflow/repair-case-detail-screen.tsx"), "utf8");
  assert.match(source, /canReleaseReplacement = repairCase\.isSuccess && !repairCase\.isFetching/);
  assert.match(source, /repairCase\.data\?\.status === "OWNER_ACKNOWLEDGED"/);
  assert.match(source, /assignment\.data\?\.status === "ACTIVE" && assignment\.data\.repairCaseId === caseId/);
  assert.match(source, /replacementCollectionAcknowledged && replacementCollectionEvent\?\.machineId === assignment\.data\.replacementMachineId/);
  assert.match(source, /primaryReturnAcknowledged && primaryReturnEvent\?\.machineId === repairCase\.data\.primaryMachineId/);
  assert.match(source, /const canReleaseAsRole = role === "admin" \|\| role === "moderator" \|\| role === "technician"/);
  assert.match(source, /replacementAssignmentsApi\.release\(expectedAssignmentId, releaseRequest\)/);
  assert.match(source, /idempotencyKey: globalThis\.crypto\.randomUUID\(\)/);
  assert.match(source, /correlationId: globalThis\.crypto\.randomUUID\(\)/);
  assert.match(source, /releaseReadAfterWriteConfirmed = assignment\.data\?\.status === "RELEASED" && repairCase\.data\?\.status === "CLOSED"/);
  assert.match(source, /<WorkflowStep title=\{M\.PROCESS_RELEASE_ASSIGNMENT\}/);
  assert.match(source, /<NotificationDialog\s+variant="confirm"/);
  assert.match(source, /M\.RELEASE_STATUS_SYNC_PENDING/);
  assert.doesNotMatch(source, /releaseEvidenceStepBlocked|PRIVATE_EVIDENCE_RELEASE_REQUIRED/);
});
