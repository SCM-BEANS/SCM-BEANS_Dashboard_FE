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
const now = "2026-10-31T10:00:00";
const buyback = {
  id: caseId, ownerId, contractId, machineId, status: "REQUESTED", requestedPrice: 4000000,
  approvedPrice: null, currency: "VND", reason: "Owner request", requestedAt: now,
  createdAt: now, updatedAt: now, collectionEvidenceRecorded: false,
};

function apiWith(axiosClient) {
  const schema = loadTypeScript("src/schema/buybacks.schema.ts");
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

test("buyback create validates contract/machine identity and API response", async () => {
  const calls = [];
  const api = apiWith({ post: async (url, data) => { calls.push([url, data]); return { data: buyback }; } });
  const request = { contractId, machineId, requestedPrice: 4000000, currency: "VND", reason: "Owner request", idempotencyKey: "same-key", correlationId: "corr" };
  assert.equal((await api.create(request)).id, caseId);
  assert.equal(calls[0][0], "/buybacks");
  await assert.rejects(api.create({ ...request, machineId: ownerId }), /selected Contract and machine/i);
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
  const source = readFileSync(join(__dirname, "../src/components/features/buyback/buyback-workflow-screen.tsx"), "utf8");
  assert.match(source, /downloadPaymentProofContent/);
  assert.match(source, /proofReviewReason/);
  assert.match(source, /idempotencyKeys = useRef\(new Map/);
  assert.match(source, /operationKey\("refurbishment-complete", caseData\.id\)/);
  assert.match(source, /clearOperationKey\("create-payment", input\.id\)/);
  assert.match(source, /Chia sẻ mã hồ sơ\/chứng từ với operator/);
  assert.doesNotMatch(source, /caseData\.inspection\.evidenceReferences/);
  assert.doesNotMatch(source, /caseData\.refurbishment\.evidenceReferences/);
});
