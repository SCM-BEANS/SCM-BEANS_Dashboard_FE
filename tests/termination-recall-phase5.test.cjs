const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const passthrough = { parse: (value) => value };
const schemas = new Proxy({}, { get: () => passthrough });

function loadApi(relativePath, axiosClient) {
  const fileName = join(__dirname, "..", relativePath);
  const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", outputText)((id) => {
    if (id === "@/lib/http") return { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" };
    if (id.startsWith("@/schema/")) return schemas;
    if (id === "@/schema/contracts.schema") return { ContractIdSchema: passthrough };
    return require(id);
  }, loaded, loaded.exports);
  return loaded.exports;
}

const caseId = "00000000-0000-4000-8000-000000000001";
const workOrderId = "00000000-0000-4000-8000-000000000002";
const evidenceId = "00000000-0000-4000-8000-000000000003";
const caseResponse = { id: caseId, contractId: "00000000-0000-4000-8000-000000000004", status: "REQUESTED" };
const orderResponse = { id: workOrderId, terminationCaseId: caseId, status: "UNASSIGNED" };

test("termination case actions use confirmed lifecycle routes and don't call retired direct handover", async () => {
  const calls = [];
  const axiosClient = {
    get: async (url, config) => { calls.push(["GET", url, config]); return { data: caseResponse }; },
    post: async (url, data, config) => { calls.push(["POST", url, data, config]); return { data: { ...caseResponse, status: url.endsWith("/recovery") ? "RECOVERY_PENDING" : "REQUESTED", inspectionTicketId: url.endsWith("/inspection-tickets") ? evidenceId : null } }; },
  };
  const { terminationCasesApi } = loadApi("src/apis/termination-cases.api.ts", axiosClient);
  await terminationCasesApi.getById(caseId);
  await terminationCasesApi.beginRecovery(caseId, { correlationId: "recover-1" });
  await terminationCasesApi.createInspectionTicket(caseId, { correlationId: "inspection-1" });
  assert.deepEqual(calls.map(([method, url]) => [method, url]), [
    ["GET", `/termination-cases/${caseId}`],
    ["POST", `/termination-cases/${caseId}/recovery`],
    ["POST", `/termination-cases/${caseId}/inspection-tickets`],
  ]);
  assert.equal(calls.some(([, url]) => url.endsWith("/handover")), false);
});

test("recall work-order API scopes list params, uploads private evidence, and reads content as a blob", async () => {
  const calls = [];
  const axiosClient = {
    get: async (url, config) => {
      calls.push(["GET", url, config]);
      if (url.endsWith("/evidence")) return { data: [{ id: evidenceId, recallWorkOrderId: workOrderId, evidenceType: "PICKUP" }] };
      if (url.endsWith(`/${evidenceId}`)) return { data: new Blob(["private"]), headers: { "content-type": "application/pdf" } };
      return { data: { id: workOrderId, terminationCaseId: caseId, status: "PICKUP_IN_PROGRESS" } };
    },
    post: async (url, data, config) => {
      calls.push(["POST", url, data, config]);
      return { data: { id: workOrderId, terminationCaseId: caseId, status: url.endsWith("/pickup/start") ? "PICKUP_IN_PROGRESS" : "PICKUP_IN_PROGRESS", evidenceType: "PICKUP", recallWorkOrderId: workOrderId } };
    },
  };
  const { recallWorkOrdersApi } = loadApi("src/apis/recall-work-orders.api.ts", axiosClient);
  await recallWorkOrdersApi.list({ contractId: caseId, page: 0, size: 20 });
  const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])], "pickup.pdf", { type: "application/pdf" });
  await recallWorkOrdersApi.uploadEvidence(workOrderId, "PICKUP", "corr-1", file);
  const downloaded = await recallWorkOrdersApi.downloadEvidence(workOrderId, evidenceId);
  assert.equal(downloaded.blob instanceof Blob, true);
  assert.deepEqual(calls.map(([method, url]) => [method, url]), [
    ["GET", "/recall-work-orders"],
    ["POST", `/recall-work-orders/${workOrderId}/evidence`],
    ["GET", `/recall-work-orders/${workOrderId}/evidence/${evidenceId}`],
  ]);
  assert.equal(calls[0][2].params.contractId, caseId);
  assert.equal(calls[1][2] instanceof FormData, true);
  assert.equal(calls[1][3].params.evidenceType, "PICKUP");
  assert.equal(calls[2][2].responseType, "blob");
});

test("recall evidence rejects unsupported MIME and file signature mismatch before request", async () => {
  let called = false;
  const { recallWorkOrdersApi } = loadApi("src/apis/recall-work-orders.api.ts", {
    post: async () => { called = true; return { data: {} }; },
  });
  const disguised = new File(["not a pdf"], "evidence.pdf", { type: "application/pdf" });
  await assert.rejects(recallWorkOrdersApi.uploadEvidence(workOrderId, "PICKUP", "corr-2", disguised), /does not match|khớp/i);
  assert.equal(called, false);
});

test("termination inspection uses backend responsibility enum and private evidence remains a gate", () => {
  const schemaSource = readFileSync(join(__dirname, "../src/schema/termination-workflow.schema.ts"), "utf8");
  const screenSource = readFileSync(join(__dirname, "../src/components/features/contract-termination/contract-termination-panel.tsx"), "utf8");
  const recallSource = readFileSync(join(__dirname, "../src/components/features/contract-termination/recall-work-orders-screen.tsx"), "utf8");
  assert.match(schemaSource, /responsibility:\s*z\.enum\(\["TENANT", "COMPANY", "UNKNOWN"\]\)/);
  assert.match(screenSource, /Maintenance Ticket hiện chưa có API upload\/đọc evidence/);
  assert.match(recallSource, /recallWorkOrdersApi\.uploadEvidence/);
  assert.match(recallSource, /recallWorkOrdersApi\.downloadEvidence/);
  assert.doesNotMatch(recallSource, /terminationCasesApi\.recordHandover/);
});
