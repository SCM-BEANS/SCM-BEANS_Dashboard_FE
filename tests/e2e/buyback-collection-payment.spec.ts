import { expect, test, type Page } from "@playwright/test";

const caseId = "e2256a5f-64dd-4a91-915a-e2322cc05256";
const ownerId = "4f20a0d0-760d-46ba-bb64-523a741a28b9";
const moderatorId = "21e9f2f6-cb66-41d8-88e6-7b816f2de8f7";
const technicianId = "ad1c3358-dd25-44b4-ae83-5c6ef3e1934a";
const adminId = "fcedb831-2a42-45bc-b32f-dc3cb7e99c57";
const paymentId = "b3fa6733-2d95-4b2d-9c3e-d6a5f6d80c00";
const proofId = "331c6199-a97f-42fd-9f02-a4f8d5297f6a";
const contractId = "a2299f86-0a8c-4a4d-a176-76c8ec81add5";
const inspectionId = "ba8db8e7-32ec-4c43-9f35-8804e180a3a4";
const legacyCaseId = "e46df306-3cd5-43eb-88d7-3958cb1ca3a1";
const legacyContractId = "5ce34153-43fc-4da6-9620-dba0d03e32b3";
const legacyMachineId = "61d5f080-6d1e-4c4a-8fd5-4c87ed54be37";
const legacyRefurbishmentId = "fda3a578-0b1f-4c56-b5e7-03ea9771d9e3";
const legacyQaDecisionId = "967c6819-797b-4427-a5f2-4ab99e5e693a";
const refurbishmentId = "6c8c4f47-37a8-4217-8445-991f84e9a620";
const refurbishmentMachineId = "e896cc8d-1760-4484-a47a-a241424a4192";
const conventionalModelId = "0050dfff-8928-4857-a186-dd536762d003";
const smartModelId = "166fae4c-9c66-40cc-9ab2-326a010026e0";
const inactiveModelId = "93122089-d1bb-4053-9ff4-b285df6497fb";
const registeredMachineId = "0e93918c-a473-4bed-8887-01cc38bdb3a7";

function refurbishmentResponse(status: string, technicianId: string, completed = false) {
  return {
    id: refurbishmentId,
    ownerId,
    buybackCaseId: caseId,
    machineId: refurbishmentMachineId,
    status,
    workPerformed: completed ? "Replaced pump and cleaned the intake." : null,
    partsAndCost: 25000,
    currency: "VND",
    technicianId,
    startedAt: "2026-11-03T10:30:00",
    completedAt: completed ? "2026-11-03T11:30:00" : null,
    evidenceReferences: null,
    result: completed ? "Machine works normally after refurbishment." : null,
  };
}

function caseResponse(
  status: string,
  collectionEvidenceRecorded: boolean,
  collectionTechnicianId: string | null,
  refurbishmentTechnicianId: string | null = null,
  refurbishment: ReturnType<typeof refurbishmentResponse> | null = null,
  registeredMachineId: string | null = null,
) {
  return {
    id: caseId,
    ownerId,
    contractId: null,
    policyVersion: 1,
    machineId: registeredMachineId,
    status,
    workflowVersion: 2,
    requestedPrice: null,
    approvedPrice: 850000,
    currency: "VND",
    externalAgreementReference: null,
    reason: "Owner requests buyback",
    requestedAt: "2026-11-03T08:00:00",
    approvedAt: "2026-11-03T08:30:00",
    valuationDecisionByRole: "MODERATOR",
    valuationDecisionReason: "Inspected and approved",
    rejectedAt: null,
    rejectionReason: null,
    cancelledAt: null,
    cancellationReason: null,
    collectionEvidenceRecorded,
    collectedAt: ["COLLECTED", "PAYMENT_PENDING", "PAID", "REFURBISHING", "READY_FOR_REGISTRATION", "REGISTERED"].includes(status) ? "2026-11-03T09:30:00" : null,
    createdAt: "2026-11-03T08:00:00",
    updatedAt: "2026-11-03T09:30:00",
    inspection: null,
    refurbishment,
    qaDecision: null,
    inspectionsPath: `/api/v1/buybacks/${caseId}/inspections`,
    refurbishmentsPath: `/api/v1/buybacks/${caseId}/refurbishments`,
    qaDecisionsPath: `/api/v1/buybacks/${caseId}/qa-decisions`,
    assetSerial: "OWNER-SERIAL-01",
    assetManufacturer: "Dolores",
    assetModelLabel: "Machine V2",
    assetDescription: "External buyback fixture",
    assetEvidenceReference: null,
    responsibleModeratorId: moderatorId,
    inspectionTechnicianId: null,
    collectionTechnicianId,
    refurbishmentTechnicianId,
    proposedPrice: 850000,
    acceptedPrice: 850000,
    registeredMachineId,
    collectionLocation: null,
    ownerAccepted: true,
    ownerDecisionBy: ownerId,
    ownerDecisionAt: "2026-11-03T08:45:00",
    ownerDecisionReason: "I accept",
    machineSerialNumber: "OWNER-SERIAL-01",
    machineModelName: "Machine V2",
  };
}

function proofResponse(status: string, submittedBy: string) {
  return {
    id: proofId,
    buybackCaseId: caseId,
    paymentId,
    amount: 850000,
    currency: "VND",
    originalFilename: "payment-proof.pdf",
    contentType: "application/pdf",
    sizeBytes: 12,
    sha256: "0".repeat(64),
    status,
    submittedBy,
    submittedAt: "2026-11-03T09:45:00",
    reviewedBy: status === "APPROVED" ? adminId : null,
    reviewedAt: status === "APPROVED" ? "2026-11-03T10:00:00" : null,
    reviewReason: status === "APPROVED" ? "Verified" : null,
    ownerRespondedBy: status === "OWNER_CONFIRMED" || status === "OWNER_NOT_RECEIVED" ? ownerId : null,
    ownerRespondedAt: status === "OWNER_CONFIRMED" || status === "OWNER_NOT_RECEIVED" ? "2026-11-03T10:15:00" : null,
  };
}

function inspectionResponse(condition: string, valuationAmount: number, notes: string | null) {
  return {
    id: inspectionId,
    ownerId,
    buybackCaseId: caseId,
    condition,
    valuationAmount,
    currency: "VND",
    notes,
    evidenceReferences: null,
    decision: null,
    inspectorId: technicianId,
    inspectedAt: "2026-11-03T08:20:00",
  };
}

async function setRole(page: Page, role: string, subject: string) {
  const encoded = Buffer.from(JSON.stringify({ roles: [role], sub: subject })).toString("base64url");
  await page.context().addCookies([{
    name: "access_token",
    value: `header.${encoded}.signature`,
    domain: "127.0.0.1",
    path: "/",
  }]);
}

test("v2 collection and payout screens follow Dolores role and status gates", async ({ page }) => {
  let status = "REQUESTED";
  let created = false;
  let approvedPrice: number | null = null;
  let proposedPrice: number | null = null;
  let acceptedPrice: number | null = null;
  let ownerAccepted: boolean | null = null;
  let ownerDecisionReason: string | null = null;
  let valuationDecisionReason: string | null = null;
  let inspectionTechnicianId: string | null = null;
  let inspection: ReturnType<typeof inspectionResponse> | null = null;
  let evidenceRecorded = false;
  let assignedTechnicianId: string | null = null;
  let assignedRefurbishmentTechnicianId: string | null = null;
  let refurbishment: ReturnType<typeof refurbishmentResponse> | null = null;
  let registeredMachine: string | null = null;
  let denyUnassignedTechnicianDetail = false;
  let machineModelRequestCount = 0;
  let registeredDetailGetCount = 0;
  let currentProof: ReturnType<typeof proofResponse> | null = null;
  const mutations: Array<{ method: string; path: string; body: Record<string, unknown> | null }> = [];
  const currentCaseResponse = () => ({
    ...caseResponse(
      status,
      evidenceRecorded,
      assignedTechnicianId,
      assignedRefurbishmentTechnicianId,
      refurbishment,
      registeredMachine,
    ),
    approvedPrice,
    proposedPrice,
    acceptedPrice,
    ownerAccepted,
    ownerDecisionBy: ownerAccepted ? ownerId : null,
    ownerDecisionAt: ownerAccepted ? "2026-11-03T08:45:00" : null,
    ownerDecisionReason,
    valuationDecisionByRole: approvedPrice == null ? null : "MODERATOR",
    valuationDecisionReason,
    inspectionTechnicianId,
    inspection,
  });

  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    const method = request.method();
    const body = method === "POST" && request.headers()["content-type"]?.includes("application/json")
      ? request.postDataJSON() as Record<string, unknown>
      : null;
    const respond = (data: unknown, responseStatus = 200, headers: Record<string, string> = {}) =>
      route.fulfill({ status: responseStatus, contentType: "application/json", headers, body: JSON.stringify(data) });

    if (path === "/profiles" && method === "GET") {
      return respond({
        items: [{
          idaasUserId: technicianId,
          email: "tech@example.test",
          fullName: "Buyback Technician",
          phone: null,
          emailVerified: true,
          roles: ["TECHNICIAN"],
          status: "ACTIVE",
          createdAt: null,
          updatedAt: null,
          contractsUrl: null,
        }],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      });
    }
    if (path === "/machine-models" && method === "GET") {
      machineModelRequestCount += 1;
      if (machineModelRequestCount === 1) return respond({ message: "Model catalog temporarily unavailable" }, 503);
      return respond([
        { id: conventionalModelId, modelCode: "CONV-01", manufacturer: "Dolores", displayName: "Conventional model", machineType: "CONVENTIONAL", active: true },
        { id: smartModelId, modelCode: "IOT-01", manufacturer: "Dolores", displayName: "Smart model", machineType: "SMART_IOT", active: true },
        { id: inactiveModelId, modelCode: "CONV-OLD", manufacturer: "Dolores", displayName: "Inactive model", machineType: "CONVENTIONAL", active: false },
      ]);
    }
    if (path === `/contracts/owner/${ownerId}` && method === "GET") {
      return respond([{ id: contractId, ownerId, machineId: null, status: "ACTIVE" }]);
    }
    if (path === "/buybacks" && method === "GET") {
      return respond(created ? [currentCaseResponse()] : [], 200, {
        "X-Page": "0",
        "X-Page-Size": "50",
        "X-Has-Next": "false",
      });
    }
    if (path === "/dashboard/action-items" && method === "GET") {
      const hasOwnerReceiptAction = currentProof?.status === "SUBMITTED" && status === "PAYMENT_PENDING";
      return respond({
        items: hasOwnerReceiptAction ? [{
          actionKey: `BUYBACK_PAYMENT_PROOF:${proofId}:BUYBACK_OWNER_RECEIPT`,
          resourceType: "BUYBACK_PAYMENT_PROOF",
          resourceId: proofId,
          actionType: "BUYBACK_OWNER_RECEIPT",
          status: "SUBMITTED",
          title: "Phản hồi về khoản thanh toán mua lại",
          ownerId,
          ownerName: "Buyback Owner",
          contractId: null,
          machineId: null,
          machineSerialNumber: null,
          technicianId: null,
          technicianName: null,
          createdAt: "2026-11-03T09:45:00Z",
          scheduledAt: null,
          dueAt: null,
          overdue: false,
          priority: "NORMAL",
          priorityReason: null,
          detailPath: `/api/v1/buybacks/${caseId}`,
          workType: "BUYBACK",
          availableActions: [
            { code: "VIEW", method: "GET", path: `/api/v1/buybacks/${caseId}` },
            { code: "RESPOND_BUYBACK_PAYMENT_RECEIPT", method: "POST", path: `/api/v1/buybacks/payment-proofs/${proofId}/owner-receipt` },
          ],
          nextAction: { code: "RESPOND_BUYBACK_PAYMENT_RECEIPT", method: "POST", path: `/api/v1/buybacks/payment-proofs/${proofId}/owner-receipt` },
        }] : [],
        page: 0,
        size: 20,
        hasMore: false,
        generatedAt: "2026-11-03T09:45:00Z",
        businessTimezone: "Asia/Ho_Chi_Minh",
        workflowAvailability: [],
      });
    }
    if (path === `/buybacks/${caseId}` && method === "GET") {
      if (denyUnassignedTechnicianDetail) {
        return respond({ message: "Technician is not assigned to this buyback case" }, 403);
      }
      if (status === "REGISTERED") registeredDetailGetCount += 1;
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/payment-proofs` && method === "GET") {
      return respond(currentProof ? [currentProof] : [], 200, {
        "X-Page": "0",
        "X-Page-Size": "50",
        "X-Has-Next": "false",
      });
    }
    if (method === "POST") mutations.push({ method, path, body });
    if (path === "/buybacks" && method === "POST") {
      created = true;
      return respond(currentCaseResponse(), 201);
    }
    if (path === `/buybacks/${caseId}/inspection/assign` && method === "POST") {
      inspectionTechnicianId = String(body?.technicianId);
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/inspection/start` && method === "POST") {
      status = "INSPECTION_PENDING";
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/inspection` && method === "POST") {
      status = "VALUATION_PENDING";
      proposedPrice = Number(body?.valuationAmount);
      inspection = inspectionResponse(
        String(body?.condition),
        proposedPrice,
        typeof body?.notes === "string" ? body.notes : null,
      );
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/valuation` && method === "POST") {
      status = body?.approved ? "APPROVED" : "REJECTED";
      approvedPrice = body?.approved ? Number(body.approvedPrice) : null;
      valuationDecisionReason = String(body?.reason);
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/owner-decision` && method === "POST") {
      ownerAccepted = Boolean(body?.accepted);
      ownerDecisionReason = String(body?.reason);
      acceptedPrice = ownerAccepted ? approvedPrice : null;
      if (!ownerAccepted) status = "REJECTED";
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/collection/request` && method === "POST") {
      status = "COLLECTION_PENDING";
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/collection/assign` && method === "POST") {
      assignedTechnicianId = String(body?.technicianId);
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/collection/evidence` && method === "POST") {
      evidenceRecorded = true;
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/collection/confirm` && method === "POST") {
      status = "COLLECTED";
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/payments` && method === "POST") {
      status = "PAYMENT_PENDING";
      return respond({
        id: paymentId,
        ownerId,
        buybackCaseId: caseId,
        amount: 850000,
        currency: "VND",
        paymentMethod: body?.paymentMethod,
        externalReference: body?.externalReference ?? null,
        status: "PENDING",
        createdBy: moderatorId,
        createdAt: "2026-11-03T09:40:00",
        settledBy: null,
        settledAt: null,
        reviewNote: null,
      }, 201);
    }
    if (path === `/buybacks/${caseId}/payment-proofs` && method === "POST") {
      currentProof = proofResponse("SUBMITTED", moderatorId);
      return respond(currentProof, 201);
    }
    if (path === `/buybacks/payment-proofs/${proofId}/owner-receipt` && method === "POST") {
      const received = body?.received === true;
      currentProof = proofResponse(received ? "OWNER_CONFIRMED" : "OWNER_NOT_RECEIVED", moderatorId);
      if (received) status = "PAID";
      return respond(currentProof);
    }
    if (path === `/buybacks/payment-proofs/${proofId}/review` && method === "POST") {
      currentProof = proofResponse(body?.approved ? "APPROVED" : "REJECTED", moderatorId);
      if (body?.approved) status = "PAID";
      return respond(currentProof);
    }
    if (path === `/buybacks/${caseId}/refurbishment/assign` && method === "POST") {
      assignedRefurbishmentTechnicianId = String(body?.technicianId);
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/refurbishment/start` && method === "POST") {
      status = "REFURBISHING";
      refurbishment = refurbishmentResponse("OPEN", assignedRefurbishmentTechnicianId ?? technicianId);
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/refurbishment/complete` && method === "POST") {
      status = "READY_FOR_REGISTRATION";
      refurbishment = refurbishmentResponse("COMPLETED", assignedRefurbishmentTechnicianId ?? technicianId, true);
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/${caseId}/register-machine` && method === "POST") {
      status = "REGISTERED";
      registeredMachine = registeredMachineId;
      return respond(currentCaseResponse());
    }
    if (path === `/buybacks/payment-proofs/${proofId}/content` && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-fixture" });
    }
    if (path.startsWith("/notifications")) return respond([]);
    return respond({});
  });

  await setRole(page, "OWNER", ownerId);
  await page.goto("/dashboard/buyback/new");
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("button", { name: "Gửi yêu cầu thu mua" })).toBeDisabled();
  }
  await page.getByLabel("Tôi xác nhận gửi yêu cầu để Dolores tiếp nhận và kiểm tra máy.").check();
  await page.getByRole("button", { name: "Gửi yêu cầu thu mua" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ tiếp nhận" })).toBeVisible();

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto("/moderator/buyback");
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("region", { name: "Danh sách hồ sơ thu mua" })).toBeVisible();
    await expect(page.getByRole("link", { name: caseId })).toBeVisible();
  }
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ tiếp nhận" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quay lại danh sách" })).toHaveAttribute("href", "/moderator/buyback/list");
  await page.getByRole("link", { name: "Quay lại danh sách" }).click();
  await expect(page.getByRole("region", { name: "Danh sách hồ sơ thu mua" })).toBeVisible();
  await page.getByRole("link", { name: caseId }).click();
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("region", { name: "Chi tiết hồ sơ thu mua" })).toBeVisible();
    await expect(page.getByLabel("Technician phụ trách")).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Yêu cầu thu máy" })).toHaveCount(0);
  await page.getByLabel("Technician phụ trách").selectOption(technicianId);
  await page.getByLabel("Lý do phân công").fill("Assign inspection to the active technician");
  await page.getByRole("button", { name: "Giao Technician kiểm tra" }).click();
  await expect(page.getByText(`Technician kiểm tra: ${technicianId}`)).toBeVisible();

  await setRole(page, "TECHNICIAN", technicianId);
  await page.goto("/technician/tasks/buyback-assessment");
  await page.getByRole("button", { name: `Tiếp nhận hồ sơ ${caseId}` }).click();
  await page.getByRole("button", { name: "Tiếp nhận", exact: true }).click();
  await expect(page.getByRole("link", { name: "Đánh giá", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Đánh giá", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ kiểm tra máy" })).toBeVisible();
  await page.getByLabel("Tình trạng máy").fill("Good working condition");
  await page.getByLabel("Giá trị thẩm định").fill("850000");
  await page.getByLabel("Tiền tệ").fill("VND");
  await page.getByLabel("Ghi chú").fill("All inspected functions operate normally");
  await page.getByRole("button", { name: "Gửi kết quả kiểm tra" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đang thẩm định giá" })).toBeVisible();

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto("/moderator/buyback");
  await page.getByRole("button", { name: "Duyệt giá", exact: true }).click();
  await page.getByLabel("Lý do quyết định").fill("Valuation approved after inspection");
  await page.getByRole("button", { name: "Duyệt giá", exact: true }).last().click();
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã duyệt giá" })).toBeVisible();

  await setRole(page, "OWNER", ownerId);
  await page.goto("/dashboard/buyback");
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByRole("heading", { name: "Quyết định giá thu mua" })).toBeVisible();
  await page.getByLabel("Lý do chấp nhận hoặc từ chối").fill("I accept the approved valuation");
  await page
    .locator('footer[aria-label^="Thao tác"]')
    .getByRole("button", { name: "Chấp nhận giá" })
    .click();
  await expect(page.getByText(/Bạn đã chấp nhận giá/)).toBeVisible();

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ thu máy" })).toBeVisible();
  await page.getByLabel("Lý do / hướng dẫn thu máy").fill("Coordinate handover");
  await page.getByRole("button", { name: "Yêu cầu thu máy" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ phân công thu máy" })).toBeVisible();

  await setRole(page, "TECHNICIAN", technicianId);
  await page.goto("/technician/tasks/buyback-assessment");
  await expect(page.getByText("Chờ phân công thu máy", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Thu máy", exact: true })).toHaveCount(0);

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await expect(page.getByText(`Sẽ dùng lại Technician đã kiểm tra máy: ${technicianId}`)).toBeVisible();
  await page.getByLabel("Lý do phân công").fill("Collect and record handover details");
  await page.getByRole("button", { name: "Giao Technician thu máy" }).click();
  await expect(page.getByText(`Technician thu máy: ${technicianId}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận đã thu máy" })).toHaveCount(0);

  await setRole(page, "TECHNICIAN", adminId);
  await page.goto("/technician/tasks/buyback-assessment");
  await expect(page.getByRole("link", { name: "Thu máy", exact: true })).toHaveCount(0);
  denyUnassignedTechnicianDetail = true;
  await page.goto(`/technician/tasks/buyback-assessment/${caseId}`);
  await expect(page.getByText("Tài khoản hiện tại không có quyền thực hiện thao tác này.", { exact: false })).toBeVisible();
  await expect(page.getByRole("region", { name: "Chi tiết hồ sơ thu mua" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ghi nhận bằng chứng thu máy" })).toHaveCount(0);
  denyUnassignedTechnicianDetail = false;

  await setRole(page, "TECHNICIAN", technicianId);
  await page.goto("/technician/tasks/buyback-assessment");
  await expect(page.getByRole("link", { name: "Thu máy", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Thu máy", exact: true }).click();
  await page.getByLabel("Serial đã xác nhận").fill("CONFIRMED-SERIAL-01");
  await page.getByLabel("Địa điểm thu máy").fill("Hồ Chí Minh");
  await page.getByLabel("Evidence reference").fill("storage-ref:mock-fixture");
  await page.getByRole("button", { name: "Ghi nhận bằng chứng thu máy" }).click();
  await expect(page.getByText(/Đã ghi nhận bằng chứng thu máy/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Ghi nhận bằng chứng thu máy" })).toHaveCount(0);

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await page.getByLabel("Evidence reference").fill("storage-ref:mock-fixture");
  await page.getByRole("button", { name: "Xác nhận đã thu máy" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã nhận máy" })).toBeVisible();

  await page.getByLabel("Phương thức thanh toán").fill("BANK_TRANSFER");
  await expect(page.getByLabel(/Số tiền/)).toHaveCount(0);
  await page.getByRole("button", { name: "Tạo khoản chi" }).click();
  await expect(page.getByText(`Mã khoản chi: ${paymentId}`)).toBeVisible();
  await page.getByLabel("Tệp PDF, JPEG hoặc PNG (tối đa 20 MB)").setInputFiles({
    name: "payment-proof.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-fixture"),
  });
  await page.getByRole("button", { name: "Tải chứng từ riêng tư" }).click();
  await expect(page.getByText("Chờ Owner xác nhận", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chọn để xét duyệt" })).toHaveCount(0);

  await setRole(page, "OWNER", ownerId);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Xem hồ sơ và chứng từ" }).click();
  await expect(page.getByText("Chờ Owner xác nhận", { exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Chưa nhận được tiền" }).click();
  await expect(page.getByRole("alertdialog", { name: "Bạn chưa nhận được tiền?" })).toBeVisible();
  await page.getByRole("button", { name: "Gửi báo chưa nhận tiền" }).click();
  await expect(page.getByRole("link", { name: "Xem hồ sơ và chứng từ" })).toHaveCount(0);

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await expect(page.getByText("Owner báo chưa nhận tiền", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cập nhật chứng từ thanh toán" })).toBeVisible();
  await page.getByLabel("Mã khoản chi").fill(paymentId);
  await page.getByLabel("Tệp PDF, JPEG hoặc PNG (tối đa 20 MB)").setInputFiles({
    name: "payment-proof-updated.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-updated-fixture"),
  });
  await page.getByRole("button", { name: "Tải chứng từ riêng tư" }).click();
  await expect(page.getByText("Chờ Owner xác nhận", { exact: true })).toBeVisible();

  await setRole(page, "OWNER", ownerId);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Đã nhận tiền" }).click();
  await expect(page.getByRole("alertdialog", { name: "Bạn đã nhận được tiền?" })).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận đã nhận tiền" }).click();
  await page.goto(`/dashboard/buyback?caseId=${caseId}`);
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã thanh toán" })).toBeVisible();

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await page.getByLabel("Technician phụ trách").selectOption(technicianId);
  await page.getByLabel("Lý do phân công").fill("Assign refurbishment work to the available technician");
  await page.getByRole("button", { name: "Giao Technician tân trang" }).click();
  await expect(page.getByText(`Technician tân trang: ${technicianId}`)).toBeVisible();

  await setRole(page, "TECHNICIAN", adminId);
  await page.goto("/technician/tasks/buyback-assessment");
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByText("Hồ sơ chưa được giao tân trang cho tài khoản Technician hiện tại.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Tân trang", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bắt đầu tân trang" })).toHaveCount(0);

  await setRole(page, "TECHNICIAN", technicianId);
  await page.goto("/technician/tasks/buyback-assessment");
  await expect(page.getByRole("link", { name: "Tân trang", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Tân trang", exact: true }).click();
  await page.getByLabel("Kế hoạch công việc").fill("Replace the worn pump and clean the intake");
  await page.getByLabel(/Chi phí linh kiện ước tính/).fill("-1");
  await expect(page.getByRole("button", { name: "Bắt đầu tân trang" })).toBeDisabled();
  await page.getByLabel(/Chi phí linh kiện ước tính/).fill("25000");
  await page.getByRole("button", { name: "Bắt đầu tân trang" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đang tân trang" })).toBeVisible();

  await setRole(page, "TECHNICIAN", adminId);
  await page.goto("/technician/tasks/buyback-assessment");
  await expect(page.getByRole("link", { name: "Tiếp tục tân trang", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByText("Chỉ Technician được giao tân trang mới có thể ghi kết quả cho hồ sơ này.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hoàn tất tân trang" })).toHaveCount(0);

  await setRole(page, "TECHNICIAN", technicianId);
  await page.goto("/technician/tasks/buyback-assessment");
  await expect(page.getByRole("link", { name: "Tiếp tục tân trang", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Tiếp tục tân trang", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đang tân trang" })).toBeVisible();
  await page.getByLabel("Công việc đã làm").fill("Replaced pump and cleaned the intake");
  await page.getByLabel("Kết quả").fill("Machine works normally after refurbishment");
  await page.getByRole("button", { name: "Hoàn tất tân trang" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ đăng ký máy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kiểm định độc lập" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Đăng ký máy" })).toHaveCount(0);
  await page.goto("/technician/tasks/buyback-assessment");
  await expect(page.getByText("Chờ đăng ký máy", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tân trang", exact: true })).toHaveCount(0);

  await setRole(page, "MODERATOR", adminId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await expect(page.getByRole("button", { name: "Đăng ký máy" })).toHaveCount(0);

  await setRole(page, "ADMIN", adminId);
  await page.goto("/admin/buybacks");
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ đăng ký máy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng ký máy" })).toHaveCount(0);

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Tải lại danh mục model" }).click();
  await expect(page.getByLabel("Model")).toBeVisible();
  await page.getByLabel("Loại máy").selectOption("SMART_IOT");
  await expect(page.getByLabel("Model").locator("option")).toHaveCount(2);
  await page.getByLabel("Model").selectOption(smartModelId);
  await page.getByLabel("Loại máy").selectOption("CONVENTIONAL");
  await expect(page.getByLabel("Model")).toHaveValue("");
  await expect(page.getByLabel("Model").locator("option")).toHaveCount(2);
  await page.getByLabel("Model").selectOption(conventionalModelId);
  await page.getByLabel("Khu vực (tùy chọn)").fill("Hồ Chí Minh");
  await page.getByLabel("Lý do đăng ký").fill("Register the refurbished machine in Dolores");
  const registeredGetsBeforeMutation = registeredDetailGetCount;
  await page.getByRole("button", { name: "Đăng ký máy" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã đăng ký máy" })).toBeVisible();
  await expect(page.getByText(`Dolores đã đăng ký máy ${registeredMachineId}.`)).toBeVisible();
  await expect.poll(() => registeredDetailGetCount).toBeGreaterThan(registeredGetsBeforeMutation);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã đăng ký máy" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: registeredMachineId })).toBeVisible();

  await setRole(page, "OWNER", ownerId);
  await page.goto("/dashboard/buyback");
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã đăng ký máy" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: registeredMachineId })).toBeVisible();

  await setRole(page, "TECHNICIAN", technicianId);
  await page.goto("/technician/tasks/buyback-assessment");
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã đăng ký máy" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: registeredMachineId })).toBeVisible();

  await setRole(page, "ADMIN", adminId);
  await page.goto("/admin/buybacks");
  await page.getByRole("link", { name: caseId }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã đăng ký máy" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: registeredMachineId })).toBeVisible();

  expect(mutations.map(({ path }) => path)).toEqual([
    "/buybacks",
    `/buybacks/${caseId}/inspection/assign`,
    `/buybacks/${caseId}/inspection/start`,
    `/buybacks/${caseId}/inspection`,
    `/buybacks/${caseId}/valuation`,
    `/buybacks/${caseId}/owner-decision`,
    `/buybacks/${caseId}/collection/request`,
    `/buybacks/${caseId}/collection/assign`,
    `/buybacks/${caseId}/collection/evidence`,
    `/buybacks/${caseId}/collection/confirm`,
    `/buybacks/${caseId}/payments`,
    `/buybacks/${caseId}/payment-proofs`,
    `/buybacks/payment-proofs/${proofId}/owner-receipt`,
    `/buybacks/${caseId}/payment-proofs`,
    `/buybacks/payment-proofs/${proofId}/owner-receipt`,
    `/buybacks/${caseId}/refurbishment/assign`,
    `/buybacks/${caseId}/refurbishment/start`,
    `/buybacks/${caseId}/refurbishment/complete`,
    `/buybacks/${caseId}/register-machine`,
  ]);
  const paymentRequest = mutations.find(({ path }) => path === `/buybacks/${caseId}/payments`);
  expect(paymentRequest?.body).not.toHaveProperty("amount");
  const ownerReceiptRequests = mutations.filter(({ path }) => path === `/buybacks/payment-proofs/${proofId}/owner-receipt`);
  expect(ownerReceiptRequests).toHaveLength(2);
  expect(ownerReceiptRequests.map(({ body }) => body?.received)).toEqual([false, true]);
  for (const { body } of ownerReceiptRequests) {
    expect(body).toMatchObject({ idempotencyKey: expect.any(String), correlationId: expect.any(String) });
    expect(body).not.toHaveProperty("approved");
  }
  const createRequest = mutations.find(({ path }) => path === "/buybacks");
  expect(createRequest?.body).toMatchObject({ idempotencyKey: expect.any(String), correlationId: expect.any(String) });
  expect(createRequest?.body?.correlationId).toBe(createRequest?.body?.idempotencyKey);
  expect(createRequest?.body).not.toHaveProperty("contractId");
  expect(createRequest?.body).not.toHaveProperty("machineId");
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/inspection/assign`)?.body).toMatchObject({ technicianId });
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/inspection`)?.body).toMatchObject({
    condition: "Good working condition",
    valuationAmount: 850000,
    currency: "VND",
    notes: "All inspected functions operate normally",
  });
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/valuation`)?.body).toMatchObject({
    approved: true,
    approvedPrice: 850000,
    reason: "Valuation approved after inspection",
  });
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/owner-decision`)?.body).toMatchObject({
    accepted: true,
    reason: "I accept the approved valuation",
  });
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/refurbishment/assign`)?.body).toMatchObject({ technicianId });
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/refurbishment/start`)?.body).toMatchObject({
    workPlanned: "Replace the worn pump and clean the intake",
    estimatedPartsCost: 25000,
    currency: "VND",
  });
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/refurbishment/complete`)?.body).toMatchObject({
    workPerformed: "Replaced pump and cleaned the intake",
    result: "Machine works normally after refurbishment",
  });
  expect(mutations.find(({ path }) => path === `/buybacks/${caseId}/register-machine`)?.body).toMatchObject({
    machineType: "CONVENTIONAL",
    modelId: conventionalModelId,
    region: "Hồ Chí Minh",
    reason: "Register the refurbished machine in Dolores",
  });
  expect(machineModelRequestCount).toBe(2);
});

test("registered case with no returned machine ID stays visibly incomplete", async ({ page }) => {
  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    if (request.method() === "GET" && path === `/buybacks/${caseId}`) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(caseResponse("REGISTERED", false, technicianId, technicianId)),
      });
    }
    if (path === `/buybacks/${caseId}/payment-proofs` && request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-Page": "0", "X-Page-Size": "50", "X-Has-Next": "false" },
        body: "[]",
      });
    }
    if (path.startsWith("/notifications")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${caseId}`);
  await expect(page.getByRole("heading", { name: "Hồ sơ Đã đăng ký máy" })).toBeVisible();
  await expect(page.locator('p[role="alert"]').filter({ hasText: "chưa có mã máy" })).toBeVisible();
  await expect(page.getByRole("term", { name: "Mã máy Dolores" })).toHaveCount(0);
  await expect(page.getByText(/Dolores đã đăng ký máy/)).toHaveCount(0);
});

test("registration 403, 404, 409, and 422 errors stay visible without reporting success", async ({ page }) => {
  let registrationErrorStatus = 403;
  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    if (request.method() === "GET" && path === `/buybacks/${caseId}`) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(caseResponse(
          "READY_FOR_REGISTRATION",
          false,
          technicianId,
          technicianId,
          refurbishmentResponse("COMPLETED", technicianId, true),
        )),
      });
    }
    if (request.method() === "GET" && path === "/machine-models") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: conventionalModelId,
          modelCode: "CONV-01",
          manufacturer: "Dolores",
          displayName: "Conventional model",
          machineType: "CONVENTIONAL",
          active: true,
        }]),
      });
    }
    if (request.method() === "POST" && path === `/buybacks/${caseId}/register-machine`) {
      return route.fulfill({
        status: registrationErrorStatus,
        contentType: "application/json",
        body: JSON.stringify({ message: `Mock registration error ${registrationErrorStatus}` }),
      });
    }
    if (path === `/buybacks/${caseId}/payment-proofs` && request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-Page": "0", "X-Page-Size": "50", "X-Has-Next": "false" },
        body: "[]",
      });
    }
    if (path.startsWith("/notifications")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await setRole(page, "MODERATOR", moderatorId);
  for (const status of [403, 404, 409, 422]) {
    registrationErrorStatus = status;
    await page.goto(`/moderator/buyback/${caseId}`);
    await expect(page.getByLabel("Model")).toBeVisible();
    await page.getByLabel("Model").selectOption(conventionalModelId);
    await page.getByLabel("Lý do đăng ký").fill(`Registration error fixture ${status}`);
    await page.getByRole("button", { name: "Đăng ký máy" }).click();
    await expect(page.getByRole("region", { name: "Chi tiết hồ sơ thu mua" }).getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hồ sơ Chờ đăng ký máy" })).toBeVisible();
    await expect(page.getByText(/Dolores đã đăng ký máy/)).toHaveCount(0);
  }
});

test("Owner cannot open a buyback request without an active contract", async ({ page }) => {
  const mutations: string[] = [];
  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    if (request.method() === "GET" && path === `/contracts/owner/${ownerId}`) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (request.method() === "GET" && path === "/buybacks") {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "X-Page": "0", "X-Page-Size": "50", "X-Has-Next": "false" }, body: "[]" });
    }
    if (request.method() === "POST") mutations.push(path);
    if (path.startsWith("/notifications")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await setRole(page, "OWNER", ownerId);
  await page.goto("/dashboard/buyback/new");
  await expect(page.getByText("Bạn cần có hợp đồng đang hoạt động để mở hồ sơ thu mua.")).toBeVisible();
  await page.getByLabel("Tôi xác nhận gửi yêu cầu để Dolores tiếp nhận và kiểm tra máy.").check();
  await expect(page.getByRole("button", { name: "Gửi yêu cầu thu mua" })).toBeDisabled();
  expect(mutations).toEqual([]);
});

test("legacy buyback keeps refurbishment and QA steps", async ({ page }) => {
  let status = "COLLECTED";
  let refurbishment: ReturnType<typeof refurbishmentResponse> | null = null;
  let qaDecision: Record<string, unknown> | null = null;
  const mutations: Array<{ path: string; body: Record<string, unknown> | null }> = [];
  const legacyCase = () => ({
    ...caseResponse(status, false, null),
    id: legacyCaseId,
    contractId: legacyContractId,
    machineId: legacyMachineId,
    workflowVersion: 1,
    refurbishment: refurbishment ? {
      ...refurbishment,
      id: legacyRefurbishmentId,
      buybackCaseId: legacyCaseId,
      machineId: legacyMachineId,
    } : null,
    qaDecision: qaDecision ? { ...qaDecision, eventId: legacyQaDecisionId } : null,
  });

  await page.route("**/api/dolores/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/dolores/v1", "");
    const method = request.method();
    const body = method === "POST" && request.headers()["content-type"]?.includes("application/json")
      ? request.postDataJSON() as Record<string, unknown>
      : null;
    const respond = (data: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/buybacks" && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "X-Page": "0", "X-Page-Size": "50", "X-Has-Next": "false" }, body: JSON.stringify([legacyCase()]) });
    }
    if (path === `/buybacks/${legacyCaseId}` && method === "GET") return respond(legacyCase());
    if (method === "POST") mutations.push({ path, body });
    if (path === `/buybacks/${legacyCaseId}/refurbishment/start` && method === "POST") {
      status = "REFURBISHING";
      refurbishment = refurbishmentResponse("OPEN", technicianId);
      return respond(legacyCase());
    }
    if (path === `/buybacks/${legacyCaseId}/refurbishment/complete` && method === "POST") {
      status = "QA_PENDING";
      refurbishment = refurbishmentResponse("COMPLETED", technicianId, true);
      return respond(legacyCase());
    }
    if (path === `/buybacks/${legacyCaseId}/qa` && method === "POST") {
      status = "AVAILABLE_FOR_RENT";
      qaDecision = { passed: body?.passed, actorId: moderatorId, reason: body?.reason, occurredAt: "2026-11-03T12:00:00" };
      return respond(legacyCase());
    }
    if (path.startsWith("/notifications")) return respond([]);
    return respond({});
  });

  await setRole(page, "TECHNICIAN", technicianId);
  await page.goto("/technician/tasks/buyback-assessment");
  await page.getByRole("link", { name: legacyCaseId }).click();
  await page.getByLabel("Kế hoạch công việc").fill("Replace the pump under the legacy workflow");
  await page.getByLabel("Chi phí linh kiện ước tính").fill("25000");
  await page.getByRole("button", { name: "Bắt đầu tân trang" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Đang tân trang" })).toBeVisible();
  await page.getByLabel("Công việc đã làm").fill("Replaced pump");
  await page.getByLabel("Kết quả").fill("Machine passed functional checks");
  await page.getByRole("button", { name: "Hoàn tất tân trang" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Chờ kiểm định" })).toBeVisible();

  await setRole(page, "MODERATOR", moderatorId);
  await page.goto(`/moderator/buyback/${legacyCaseId}`);
  await expect(page.getByRole("heading", { name: "Kiểm định độc lập" })).toBeVisible();
  await page.getByLabel("Lý do").fill("Legacy workflow QA passed");
  await page.getByRole("button", { name: "Ghi nhận kiểm định" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ Sẵn sàng cho thuê" })).toBeVisible();
  expect(mutations.map(({ path }) => path)).toEqual([
    `/buybacks/${legacyCaseId}/refurbishment/start`,
    `/buybacks/${legacyCaseId}/refurbishment/complete`,
    `/buybacks/${legacyCaseId}/qa`,
  ]);
  expect(mutations.find(({ path }) => path.endsWith("/qa"))?.body).toMatchObject({ passed: true, reason: "Legacy workflow QA passed" });
});
