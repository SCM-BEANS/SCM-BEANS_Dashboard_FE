const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ids = {
  request: "00000000-0000-4000-8000-000000000001",
  ticket: "00000000-0000-4000-8000-000000000002",
  review: "00000000-0000-4000-8000-000000000003",
  technician: "00000000-0000-4000-8000-000000000004",
};
const passthrough = { parse: (value) => value };
const schemas = new Proxy({}, {
  get: (_target, name) => name === "MaintenanceRequestSchema" ? { shape: { id: passthrough } } : passthrough,
});

function loadApi(relativePath, axiosClient) {
  const fileName = join(__dirname, "..", relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const mocks = { "@/lib/http": { axiosClient, DOLORES_API_BASE_URL: "/api/dolores/v1" } };
  const mockedRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/schema/")) return schemas;
    return require(id);
  };
  const loaded = { exports: {} };
  new Function("require", "exports", "module", outputText)(mockedRequire, loaded.exports, loaded);
  return loaded.exports;
}

function loadSchema(relativePath) {
  const fileName = join(__dirname, "..", relativePath);
  const source = readFileSync(fileName, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function("require", "exports", "module", outputText)(require, loaded.exports, loaded);
  return loaded.exports;
}

test("maintenance request confirmation and preventive work-order creation use linked IDs and documented bodies", async () => {
  const calls = [];
  const request = { id: ids.request, requestType: "PREVENTIVE", status: "CONFIRMED" };
  const ticket = { id: ids.ticket, maintenanceRequestId: ids.request, status: "PENDING" };
  const responses = [request, ticket];
  const axiosClient = {
    post: async (url, data, config) => {
      calls.push({ method: "POST", url, data, config });
      return { data: responses.shift() };
    },
  };
  const api = loadApi("src/apis/maintenance-requests.api.ts", axiosClient).maintenanceRequestsApi;

  assert.deepEqual(await api.confirm(ids.request, { appointmentAt: "2026-11-02T09:30" }), request);
  assert.deepEqual(await api.createWorkOrder(ids.request), ticket);
  assert.deepEqual(calls, [
    {
      method: "POST",
      url: "/maintenance-requests/" + ids.request + "/confirm",
      data: { appointmentAt: "2026-11-02T09:30" },
      config: { baseURL: "/api/dolores/v1" },
    },
    {
      method: "POST",
      url: "/maintenance-requests/" + ids.request + "/work-order",
      data: undefined,
      config: { baseURL: "/api/dolores/v1" },
    },
  ]);
});

test("ticket assignment, status, parts, and resolution calls validate the returned ticket identity/state", async () => {
  const calls = [];
  const responses = [
    { id: ids.ticket, status: "ASSIGNED", assignedTechnicianId: ids.technician },
    { id: ids.ticket, status: "IN_PROGRESS" },
    { id: ids.ticket, status: "IN_PROGRESS", partsReplaced: "Pump", partsCost: 150 },
    { id: ids.ticket, status: "RESOLVED" },
  ];
  const axiosClient = {
    post: async (url, data, config) => {
      calls.push({ url, data, config });
      return { data: responses.shift() };
    },
  };
  const api = loadApi("src/apis/machines.api.ts", axiosClient).machinesApi;
  await api.assignMaintenanceTicket(ids.ticket, { technicianId: ids.technician, assignedTo: "Tech" });
  await api.updateMaintenanceTicketStatus(ids.ticket, "IN_PROGRESS");
  await api.recordMaintenanceTicketParts(ids.ticket, { partsReplaced: "Pump", partsCost: 150 });
  await api.resolveMaintenanceTicket(ids.ticket, {
    diagnosis: "Pump fault",
    resolutionResult: "Pump replaced",
    evidenceReferences: ["private/tickets/evidence-01"],
  });

  assert.deepEqual(calls, [
    {
      url: "/maintenance-tickets/" + ids.ticket + "/assign",
      data: undefined,
      config: { baseURL: "/api/dolores/v1", params: { technicianId: ids.technician, assignedTo: "Tech" } },
    },
    {
      url: "/maintenance-tickets/" + ids.ticket + "/status",
      data: undefined,
      config: { baseURL: "/api/dolores/v1", params: { status: "IN_PROGRESS" } },
    },
    {
      url: "/maintenance-tickets/" + ids.ticket + "/parts",
      data: { partsReplaced: "Pump", partsCost: 150 },
      config: { baseURL: "/api/dolores/v1" },
    },
    {
      url: "/maintenance-tickets/" + ids.ticket + "/resolve",
      data: {
        diagnosis: "Pump fault",
        resolutionResult: "Pump replaced",
        evidenceReferences: ["private/tickets/evidence-01"],
      },
      config: { baseURL: "/api/dolores/v1" },
    },
  ]);
});

test("repair-cost review API uses documented routes and returns the same review identity", async () => {
  const calls = [];
  const review = { id: ids.review, maintenanceTicketId: ids.ticket, status: "PROPOSED" };
  const responses = [
    review,
    review,
    { ...review, status: "APPROVED_PENDING_OWNER_ACK" },
    { ...review, status: "COLLECTIBLE" },
    { ...review, status: "DISPUTED" },
    { ...review, status: "RESOLVED_PENDING_OWNER_ACK" },
  ];
  const axiosClient = {
    get: async (url, config) => {
      calls.push({ method: "GET", url, config });
      return { data: responses.shift() };
    },
    post: async (url, data, config) => {
      calls.push({ method: "POST", url, data, config });
      return { data: responses.shift() };
    },
  };
  const api = loadApi("src/apis/repair-cost-reviews.api.ts", axiosClient).repairCostReviewsApi;
  const proposal = {
    cause: "MISUSE", diagnosis: "Damaged pump", estimatedAmount: 400, currency: "VND",
    evidenceReferences: ["private/review/evidence-1"], proposedResponsibleParty: "TENANT",
  };
  const decision = { approve: true, responsibleParty: "TENANT", approvedAmount: 400, reason: "Reviewed" };
  const dispute = { reason: "I disagree", disputedAmount: 400, evidenceReferences: ["private/dispute/1"] };
  const resolution = { rejectCharge: false, responsibleParty: "COMPANY", approvedAmount: 0, reason: "Reviewed dispute" };
  await api.propose(ids.ticket, proposal);
  await api.getById(ids.review);
  await api.decide(ids.review, decision);
  await api.acknowledge(ids.review);
  await api.dispute(ids.review, dispute);
  await api.resolve(ids.review, resolution);

  assert.deepEqual(calls, [
    { method: "POST", url: "/maintenance-tickets/" + ids.ticket + "/repair-cost-reviews", data: proposal, config: { baseURL: "/api/dolores/v1" } },
    { method: "GET", url: "/repair-cost-reviews/" + ids.review, config: { baseURL: "/api/dolores/v1", signal: undefined } },
    { method: "POST", url: "/repair-cost-reviews/" + ids.review + "/decision", data: decision, config: { baseURL: "/api/dolores/v1" } },
    { method: "POST", url: "/repair-cost-reviews/" + ids.review + "/acknowledgment", data: { acknowledgeApprovedAmount: true }, config: { baseURL: "/api/dolores/v1" } },
    { method: "POST", url: "/repair-cost-reviews/" + ids.review + "/dispute", data: dispute, config: { baseURL: "/api/dolores/v1" } },
    { method: "POST", url: "/repair-cost-reviews/" + ids.review + "/resolution", data: resolution, config: { baseURL: "/api/dolores/v1" } },
  ]);
});

test("private evidence schemas reject public URLs and unsafe ticket parts values", () => {
  const machines = loadSchema("src/schema/machines.schema.ts");
  const costReviews = loadSchema("src/schema/repair-cost-reviews.schema.ts");
  const baseProposal = {
    cause: "MISUSE",
    diagnosis: "Damaged pump",
    estimatedAmount: 400,
    currency: "VND",
    evidenceReferences: ["private/review/evidence-1"],
    proposedResponsibleParty: "TENANT",
  };
  assert.equal(costReviews.RepairCostProposalRequestSchema.safeParse(baseProposal).success, true);
  assert.equal(costReviews.RepairCostProposalRequestSchema.safeParse({
    ...baseProposal,
    evidenceReferences: ["https://example.invalid/evidence"],
  }).success, false);
  assert.equal(machines.MaintenanceTicketResolutionRequestSchema.safeParse({
    diagnosis: "Pump fault",
    resolutionResult: "Pump replaced",
    evidenceReferences: ["http://example.invalid/evidence"],
  }).success, false);
  assert.equal(machines.MaintenanceTicketPartsRequestSchema.safeParse({ partsCost: -1 }).success, false);
});

test("module 1 maintenance schemas validate versioned ticket edits, review reasons, and custody evidence", () => {
  const machines = loadSchema("src/schema/machines.schema.ts");
  const validId = ids.request;
  assert.equal(machines.CreateOnDemandMaintenanceTicketRequestSchema.safeParse({ alertLevel: "Warning" }).success, true);
  assert.equal(machines.CreateOnDemandMaintenanceTicketRequestSchema.safeParse({ alertLevel: "x".repeat(51) }).success, false);
  assert.equal(machines.MaintenanceTicketDetailsPatchRequestSchema.safeParse({
    expectedVersion: 3,
    scheduledDueAt: null,
    actionableInstructions: null,
  }).success, true);
  assert.equal(machines.MaintenanceTicketDetailsPatchRequestSchema.safeParse({
    expectedVersion: 3,
    scheduledDueAt: "2026-11-10T09:30:00",
  }).success, true);
  assert.equal(machines.MaintenanceTicketDetailsPatchRequestSchema.safeParse({
    expectedVersion: 3,
    scheduledDueAt: "2026-11-10T09:30:00Z",
  }).success, false);
  assert.equal(machines.MaintenanceTicketDetailsPatchRequestSchema.safeParse({ alertLevel: "Critical" }).success, false);
  assert.equal(machines.MaintenanceRequestOverdueReviewRequestSchema.safeParse({ reason: "Đã liên hệ Owner" }).success, true);
  assert.equal(machines.MaintenanceClosureExceptionRequestSchema.safeParse({ reason: " " }).success, false);
  assert.equal(machines.MaintenanceCustodyEventCreateRequestSchema.safeParse({
    eventType: "PRIMARY_COLLECTED",
    machineId: validId,
    conditionNotes: "Vỏ máy còn nguyên",
    evidenceReference: "private/custody/primary-1",
    acknowledgementUnavailableReason: "Owner chưa thể phản hồi",
  }).success, true);
  assert.equal(machines.MaintenanceCustodyEventCreateRequestSchema.safeParse({
    eventType: "PRIMARY_COLLECTED",
    machineId: validId,
    conditionNotes: "Vỏ máy còn nguyên",
    evidenceReference: "https://example.invalid/evidence",
  }).success, false);
  assert.equal(machines.MaintenanceRequestDetailsSchema.safeParse({
    id: validId,
    requestType: "PREVENTIVE",
    machineId: validId,
    status: "CONFIRMED",
    windowStart: "2026-11-01",
    windowEnd: "2026-11-05",
  }).success, true);
});

test("role screens keep installation work orders separate and gate evidence-dependent finish and cost actions", () => {
  const owner = readFileSync(join(__dirname, "../src/components/features/maintenance-workflow/owner-maintenance-screen.tsx"), "utf8");
  const technician = readFileSync(join(__dirname, "../src/components/features/maintenance-workflow/technician-maintenance-ticket-screen.tsx"), "utf8");
  const tasks = readFileSync(join(__dirname, "../src/pages/technician/tasks/technician-tasks-table.tsx"), "utf8");
  const operator = readFileSync(join(__dirname, "../src/components/features/repair-workflow/maintenance-request-detail-screen.tsx"), "utf8");
  const costReview = readFileSync(join(__dirname, "../src/components/features/maintenance-workflow/repair-cost-review-screen.tsx"), "utf8");
  const notifications = readFileSync(join(__dirname, "../src/components/notifications/notification-inbox.tsx"), "utf8");
  const ticketRoute = readFileSync(join(__dirname, "../src/pages/technician/tasks/maintenance-tickets/[ticketId].page.tsx"), "utf8");
  assert.match(owner, /requestType: "PREVENTIVE"/);
  assert.match(owner, /maintenanceRequestsApi\.confirm/);
  assert.match(technician, /updateMaintenanceTicketStatus\(ticketId, "IN_PROGRESS"\)/);
  assert.match(technician, /recordMaintenanceTicketParts/);
  assert.match(technician, /Chưa thể hoàn tất hoặc gửi đề xuất chi phí/);
  assert.match(technician, /Ticket này thuộc quy trình RepairCase/);
  assert.doesNotMatch(technician, /@\/pages\/|TechnicianShell/);
  assert.match(tasks, /installationWorkOrdersApi\.listAssigned/);
  assert.match(tasks, /machinesApi\.listMaintenanceTicketsPage/);
  assert.match(tasks, /ticket\.assignedTechnicianId === technicianSubjectId/);
  assert.match(operator, /maintenanceRequestsApi\.createWorkOrder\(id\)/);
  assert.match(operator, /if \(!isAdmin\) throw new Error\(messages\.TECHNICAL_ASSIGNMENT_ADMIN_REQUIRED\)/);
  assert.match(operator, /technicianSearchInput/);
  assert.match(costReview, /repairCostReviewsApi\.getById/);
  assert.match(costReview, /API đọc minh chứng riêng tư/);
  assert.match(notifications, /Review ID:/);
  assert.match(ticketRoute, /isSupportedTechnicianSection/);
});
