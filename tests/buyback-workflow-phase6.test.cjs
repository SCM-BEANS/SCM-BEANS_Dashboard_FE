const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScript(relativePath, mocks = {}) {
  const fileName = join(__dirname, "..", relativePath);
  const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", outputText)((id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), loaded, loaded.exports);
  return loaded.exports;
}

const caseId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000002";
const contractId = "00000000-0000-4000-8000-000000000003";
const machineId = "00000000-0000-4000-8000-000000000004";
const paymentId = "00000000-0000-4000-8000-000000000005";
const proofId = "00000000-0000-4000-8000-000000000006";
const moderatorId = "00000000-0000-4000-8000-000000000007";
const technicianId = "00000000-0000-4000-8000-000000000008";
const modelId = "00000000-0000-4000-8000-000000000009";
const now = "2026-10-31T10:00:00";
const buyback = {
  id: caseId, ownerId, contractId: null, machineId: null, workflowVersion: 2, status: "REQUESTED", requestedPrice: null,
  approvedPrice: null, currency: "VND", reason: "Owner request", requestedAt: now,
  createdAt: now, updatedAt: now, collectionEvidenceRecorded: false,
};

function apiWith(axiosClient) {
  const machineSchema = loadTypeScript("src/schema/machines.schema.ts");
  const schema = loadTypeScript("src/schema/buybacks.schema.ts", { "@/schema/machines.schema": machineSchema });
  return loadTypeScript("src/apis/buybacks.api.ts", {
    "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" },
    "@/schema/buybacks.schema": schema,
  }).buybacksApi;
}

test("buyback list honors query scope and parses bounded-array response metadata", async () => {
  const calls = [];
  const api = apiWith({ get: async (url, config) => {
    calls.push([url, config]);
    return { data: [buyback], headers: { "X-Page": "2", "X-Page-Size": "20", "X-Has-Next": "true" } };
  } });
  const result = await api.list({ page: 2, size: 20, contractId });
  assert.equal(result.items[0].id, caseId);
  assert.equal(result.page, 2);
  assert.equal(result.hasNext, true);
  assert.deepEqual(calls[0], ["/buybacks", { baseURL: "/api/dolores/v1", params: { page: 2, size: 20, contractId }, signal: undefined }]);
});

test("external buyback create sends only idempotency contract and validates v2 response", async () => {
  const calls = [];
  const api = apiWith({ post: async (url, data) => { calls.push([url, data]); return { data: buyback }; } });
  const request = { idempotencyKey: "same-key", correlationId: "corr" };
  assert.equal((await api.create(request)).id, caseId);
  assert.equal(calls[0][0], "/buybacks");
  assert.deepEqual(calls[0][1], request);
  await assert.rejects(api.create({ ...request, machineId }), /Unrecognized key/i);
});

test("buyback assignment, collection evidence, and registration use documented routes and DTOs", async () => {
  const calls = [];
  const api = apiWith({ post: async (url, data, config) => { calls.push([url, data, config]); return { data: buyback }; } });
  const command = { reason: "Assigned by moderator", idempotencyKey: "idem", correlationId: "corr" };

  await api.assignModerator(caseId, { ...command, moderatorId });
  await api.assignInspection(caseId, { ...command, technicianId });
  await api.assignCollection(caseId, { ...command, technicianId });
  await api.recordCollectionEvidence(caseId, { confirmedSerial: "SERIAL-01", collectionLocation: "Warehouse", evidenceReference: "private-object-ref", idempotencyKey: "evidence-idem", correlationId: "evidence-corr" });
  await api.assignRefurbishment(caseId, { ...command, technicianId });
  await api.registerMachine(caseId, { machineType: "SMART_IOT", modelId, region: "South", reason: "Ready after refurbishment", idempotencyKey: "register-idem", correlationId: "register-corr" });

  assert.deepEqual(calls.map(([url]) => url), [
    `/buybacks/${caseId}/moderator/assign`,
    `/buybacks/${caseId}/inspection/assign`,
    `/buybacks/${caseId}/collection/assign`,
    `/buybacks/${caseId}/collection/evidence`,
    `/buybacks/${caseId}/refurbishment/assign`,
    `/buybacks/${caseId}/register-machine`,
  ]);
  assert.deepEqual(calls.map(([, , config]) => config), Array.from({ length: 6 }, () => ({ baseURL: "/api/dolores/v1" })));
  await assert.rejects(api.recordCollectionEvidence(caseId, { confirmedSerial: " ", collectionLocation: "Warehouse", evidenceReference: "real-ref", idempotencyKey: "idem", correlationId: "corr" }));
  await assert.rejects(api.registerMachine(caseId, { machineType: "INVALID", modelId, reason: "Ready", idempotencyKey: "idem", correlationId: "corr" }));
});

test("Phase 2 assignment, inspection, valuation, and Owner decisions match Dolores DTOs", async () => {
  const calls = [];
  const api = apiWith({
    post: async (url, data, config) => { calls.push([url, data, config]); return { data: buyback }; },
  });
  const keys = { idempotencyKey: "phase2-idem", correlationId: "phase2-correlation" };

  await api.assignInspection(caseId, { technicianId, reason: "Assign inspection", ...keys });
  await api.startInspection(caseId, { reason: "Start inspection", ...keys });
  await api.submitInspection(caseId, {
    condition: "Clean and operational",
    valuationAmount: 4250000,
    currency: "VND",
    notes: "Screen and pump checked",
    ...keys,
  });
  await api.decideValuation(caseId, {
    approved: true,
    approvedPrice: 4000000,
    reason: "Approved after review",
    ...keys,
  });
  await api.decideOwnerPrice(caseId, { accepted: true, reason: "I accept", ...keys });

  assert.deepEqual(calls.map(([url]) => url), [
    `/buybacks/${caseId}/inspection/assign`,
    `/buybacks/${caseId}/inspection/start`,
    `/buybacks/${caseId}/inspection`,
    `/buybacks/${caseId}/valuation`,
    `/buybacks/${caseId}/owner-decision`,
  ]);
  assert.deepEqual(calls.map(([, data]) => data), [
    { technicianId, reason: "Assign inspection", ...keys },
    { reason: "Start inspection", ...keys },
    { condition: "Clean and operational", valuationAmount: 4250000, currency: "VND", notes: "Screen and pump checked", ...keys },
    { approved: true, approvedPrice: 4000000, reason: "Approved after review", ...keys },
    { accepted: true, reason: "I accept", ...keys },
  ]);
  assert.ok(calls.every(([, , config]) => config.baseURL === "/api/dolores/v1"));

  await assert.rejects(api.assignInspection(caseId, { technicianId: "not-a-uuid", reason: "Assign", ...keys }));
  await assert.rejects(api.submitInspection(caseId, { condition: "OK", valuationAmount: 0, currency: "VND", ...keys }));
  await assert.rejects(api.decideValuation(caseId, { approved: true, reason: "Approved", ...keys }));
  await assert.rejects(api.decideOwnerPrice(caseId, { accepted: true, reason: " ", ...keys }));
});

test("buyback payment proof upload sends validated private multipart and parses metadata only", async () => {
  const calls = [];
  const proof = { id: proofId, buybackCaseId: caseId, paymentId, originalFilename: "proof.pdf", contentType: "application/pdf", sizeBytes: 6, sha256: "a".repeat(64), status: "SUBMITTED", submittedAt: now };
  const api = apiWith({ post: async (url, data, config) => { calls.push([url, data, config]); return { data: proof }; } });
  const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])], "proof.pdf", { type: "application/pdf" });
  assert.equal((await api.submitPaymentProof(caseId, paymentId, "idem", "corr", file)).id, proofId);
  assert.equal(calls[0][0], `/buybacks/${caseId}/payment-proofs`);
  assert.equal(calls[0][1] instanceof FormData, true);
  assert.deepEqual(calls[0][2].params, { paymentId, idempotencyKey: "idem", correlationId: "corr" });
  await assert.rejects(api.submitPaymentProof(caseId, paymentId, "idem", "corr", new File(["not pdf"], "bad.pdf", { type: "application/pdf" })), /khớp/i);
});

test("operator proof read and review use UUID routes and don't render private references", () => {
  const source = [
    "buyback-workflow-controller.tsx",
    "buyback-owner-screen.tsx",
    "buyback-moderator-screen.tsx",
    "buyback-technician-screen.tsx",
    "buyback-workflow-shared.tsx",
  ].map((file) => readFileSync(join(__dirname, "../src/components/features/buyback", file), "utf8")).join("\n");
  assert.match(source, /downloadPaymentProofContent/);
  assert.match(source, /proofReviewReason/);
  assert.match(source, /idempotencyKeys = useRef\(new Map/);
  assert.match(source, /operationKey\("refurbishment-complete", caseData\.id\)/);
  assert.match(source, /clearOperationKey\("create-payment", input\.id\)/);
  assert.match(source, /Chia sẻ mã hồ sơ\/chứng từ với operator/);
  assert.doesNotMatch(source, /caseData\.inspection\.evidenceReferences/);
  assert.doesNotMatch(source, /caseData\.refurbishment\.evidenceReferences/);
});
