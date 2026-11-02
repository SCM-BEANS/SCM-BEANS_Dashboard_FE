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
const eventId = "00000000-0000-4000-8000-000000000002";

test("Owner custody acknowledgment uses the case-scoped endpoint and checks the returned event identity", async () => {
  const calls = [];
  const event = { id: eventId, repairCaseId: caseId, maintenanceRequestId: "00000000-0000-4000-8000-000000000003" };
  let responseData = event;
  const axiosClient = {
    post: async (url, data, config) => {
      calls.push({ url, data, config });
      return { data: responseData };
    },
  };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });

  assert.deepEqual(await repairCasesApi.acknowledgeCustodyEvent(caseId, eventId, { acknowledgement: "Received the primary machine." }), event);
  assert.deepEqual(calls[0], {
    url: `/repair-cases/${caseId}/custody-events/${eventId}/acknowledge`,
    data: { acknowledgement: "Received the primary machine." },
    config: { baseURL: "/api/dolores/v1" },
  });

  responseData = { ...event, id: caseId };
  await assert.rejects(repairCasesApi.acknowledgeCustodyEvent(caseId, eventId, { acknowledgement: "Retry acknowledgement." }), /different custody event/);
});

test("PRIMARY_COLLECTED uses the case-scoped endpoint and validates the returned event", async () => {
  const machineId = "00000000-0000-4000-8000-000000000004";
  const body = { eventType: "PRIMARY_COLLECTED", machineId, conditionNotes: "Machine received", evidenceReference: "private/receipt" };
  const event = { id: eventId, repairCaseId: caseId, maintenanceRequestId: "00000000-0000-4000-8000-000000000003", eventType: body.eventType, machineId };
  const calls = [];
  let responseData = event;
  const axiosClient = { post: async (url, data, config) => { calls.push({ url, data, config }); return { data: responseData }; } };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });

  assert.deepEqual(await repairCasesApi.recordCustodyEvent(caseId, body), event);
  assert.deepEqual(calls[0], {
    url: `/repair-cases/${caseId}/custody-events`,
    data: body,
    config: { baseURL: "/api/dolores/v1" },
  });
  responseData = { ...event, machineId: eventId };
  await assert.rejects(repairCasesApi.recordCustodyEvent(caseId, body), /different RepairCase custody event/);
});

test("primary collection request sends an evidence reference string", async () => {
  const machineId = "00000000-0000-4000-8000-000000000004";
  const body = { eventType: "PRIMARY_COLLECTED", machineId, conditionNotes: "Machine received", evidenceReference: "private/receipt.jpg" };
  const event = { id: eventId, repairCaseId: caseId, maintenanceRequestId: "00000000-0000-4000-8000-000000000003", eventType: body.eventType, machineId };
  const calls = [];
  const axiosClient = { post: async (url, data, config) => { calls.push({ url, data, config }); return { data: event }; } };
  const { repairCasesApi } = loadTypeScriptModule("src/apis/repair-cases.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/machines.schema": schemaMocks,
  });

  assert.deepEqual(await repairCasesApi.recordPrimaryCollection(caseId, {
    machineId,
    conditionNotes: body.conditionNotes,
    evidenceReference: body.evidenceReference,
  }), event);
  assert.deepEqual(calls[0], {
    url: `/repair-cases/${caseId}/custody-events`,
    data: body,
    config: { baseURL: "/api/dolores/v1" },
  });
  assert.equal(typeof calls[0].data.evidenceReference, "string");
});

test("primary collection request requires a private evidence reference", () => {
  const schemas = loadTypeScriptModule("src/schema/machines.schema.ts", {});
  const body = { eventType: "PRIMARY_COLLECTED", machineId: "00000000-0000-4000-8000-000000000004", conditionNotes: "Machine received", evidenceReference: "private/receipt.jpg" };
  assert.equal(schemas.PrimaryCollectionRequestSchema.safeParse(body).success, true);
  assert.equal(schemas.PrimaryCollectionRequestSchema.safeParse({ ...body, eventType: "REPLACEMENT_DELIVERED" }).success, false);
  assert.equal(schemas.PrimaryCollectionRequestSchema.safeParse({ ...body, evidenceReference: "" }).success, false);
  assert.equal(schemas.PrimaryCollectionRequestSchema.safeParse({ ...body, evidenceReference: "https://example.com/receipt.jpg" }).success, false);
  assert.equal(schemas.MaintenanceCustodyEventCreateRequestSchema.safeParse(body).success, true);
});

test("Phase 2 keeps process actions outside the read-only timeline and gates delivery on Owner acknowledgment", () => {
  const source = readFileSync(join(__dirname, "../src/components/features/repair-workflow/repair-case-detail-screen.tsx"), "utf8");
  assert.match(source, /if \(role !== "owner"\) throw new Error\(M\.ACKNOWLEDGMENT_OWNER_ONLY\)/);
  assert.match(source, /role !== "admin" && role !== "moderator"[\s\S]*?!primaryCollectionEvent\?\.ownerAcknowledgedAt/);
  assert.match(source, /replacementAssignmentsApi\.activate\(assignment\.data\.id, input\)/);
  assert.match(source, /activationAttempt\?\.fingerprint === fingerprint/);
  assert.match(source, /idempotencyKey: globalThis\.crypto\.randomUUID\(\)/);
  assert.match(source, /machineId: repairCase\.data\.primaryMachineId/);
  assert.match(source, /input\.eventType !== "REPLACEMENT_DELIVERED"/);
  assert.match(source, /machineId: replacementMachineId/);
  assert.match(source, /renderOwnerAcknowledgment\(replacementDeliveredEvent, M\.ACKNOWLEDGMENT_REPLACEMENT_PROMPT\)/);

  const processStart = source.indexOf("aria-label={M.PROCESS_TITLE}");
  const timelineStart = source.indexOf('<section className={styles.panel} aria-label={M.TIMELINE_TITLE}>');
  assert.ok(processStart >= 0 && timelineStart > processStart, "process step list should appear before the timeline");
  const timelineEnd = source.indexOf("</section>", timelineStart);
  const timeline = source.slice(timelineStart, timelineEnd);
  assert.match(timeline, /timeline\.data\.content\.map/);
  assert.doesNotMatch(timeline, /submitReceiveMachine|submitAcknowledgement|recordPrimaryCollection|acknowledgeCustody/);

  const custodyStart = source.indexOf('<section className={styles.panel} aria-label={M.CUSTODY_TITLE}>');
  const custodyEnd = source.indexOf("</section>", custodyStart);
  const custodyHistory = source.slice(custodyStart, custodyEnd);
  assert.match(custodyHistory, /custody\.data\.items\.map/);
  assert.doesNotMatch(custodyHistory, /submitAcknowledgement|acknowledgeCustody\.mutate/);
});
