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

test("Owner acknowledgment actions are ordered and evidence blocked actions stay unavailable", () => {
  const source = readFileSync(join(__dirname, "../src/components/features/repair-workflow/repair-case-detail-screen.tsx"), "utf8");
  assert.match(source, /if \(role !== "owner"\) throw new Error\(M\.ACKNOWLEDGMENT_OWNER_ONLY\)/);
  assert.match(source, /role === "owner" && !event\.ownerAcknowledgedAt/);
  assert.match(source, /event\.eventType === "REPLACEMENT_DELIVERED" && primaryCollectionAcknowledged/);
  assert.match(source, /M\.PRIVATE_EVIDENCE_SOURCE_REQUIRED/);
  assert.doesNotMatch(source, /recordCustodyEvent\(|replacementAssignmentsApi\.activate\(/);
});
