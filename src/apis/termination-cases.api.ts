import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  buildEvidenceForm,
  EVIDENCE_MULTIPART_HEADERS,
  validateEvidenceFiles,
} from "@/lib/evidence-multipart";
import {
  TerminationActionRequestSchema,
  TerminationCaseCreateRequestSchema,
  TerminationCaseIdSchema,
  TerminationCaseListParamsSchema,
  TerminationCasePageSchema,
  TerminationCaseSchema,
  TerminationInspectionRequestSchema,
  TerminationRejectionRequestSchema,
  TerminationSettlementPreviewRequestSchema,
  TerminationSettlementPreviewSchema,
  TerminationSettlementRequestSchema,
  type TerminationActionRequest,
  type TerminationCase,
  type TerminationCaseCreateRequest,
  type TerminationCaseListParams,
  type TerminationInspectionRequest,
  type TerminationRejectionRequest,
  type TerminationSettlementPreviewRequest,
  type TerminationSettlementRequest,
} from "@/schema/termination-workflow.schema";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { TerminationInspectionResultSchema } from "@/schema/termination-cases.schema";

const casePath = (id: string) => `/termination-cases/${encodeURIComponent(TerminationCaseIdSchema.parse(id))}`;

function verifyCaseIdentity(value: unknown, expectedId: string, expectedContractId?: string) {
  const terminationCase = TerminationCaseSchema.parse(value);
  if (terminationCase.id !== expectedId || (expectedContractId && terminationCase.contractId !== expectedContractId)) {
    throw new Error("Dolores returned a different termination case than requested.");
  }
  return terminationCase;
}

export const terminationCasesApi =  {
  async list(input: TerminationCaseListParams = {}, signal?: AbortSignal) {
    const params = TerminationCaseListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/termination-cases", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const page = TerminationCasePageSchema.parse(response.data);
    if (page.page !== params.page) throw new Error("Dolores returned a different termination case page than requested.");
    return page;
  },
  async findByContractId(contractId: string, signal?: AbortSignal) {
    const validContractId = ContractIdSchema.parse(contractId);
    // shortcut: The collection has no contractId filter; add one when the API supports it.
    let rejectedCase: TerminationCase | null = null;
    for (let page = 0; ; page += 1) {
      const result = await terminationCasesApi.list({ page, size: 100 }, signal);
      const contractCases = result.content.filter((item) => item.contractId.toLowerCase() === validContractId.toLowerCase());
      const currentCase = contractCases.find((item) => item.status !== "REJECTED");
      if (currentCase) return currentCase;
      rejectedCase ??= contractCases[0] ?? null;
      if (page + 1 >= result.totalPages) return rejectedCase;
    }
  },
  async create(contractId: string, input: TerminationCaseCreateRequest) {
    const validContractId = ContractIdSchema.parse(contractId);
    const request = TerminationCaseCreateRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/contracts/${encodeURIComponent(validContractId)}/termination-cases`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const terminationCase = TerminationCaseSchema.parse(response.data);
    if (terminationCase.contractId !== validContractId || terminationCase.status !== "REQUESTED") {
      throw new Error("Dolores did not confirm a requested termination case for this Contract.");
    }
    return terminationCase;
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = TerminationCaseIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(casePath(validId), { baseURL: DOLORES_API_BASE_URL, signal });
    return verifyCaseIdentity(response.data, validId);
  },
  async getInspection(id: string, signal?: AbortSignal) {
    const validId = TerminationCaseIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${casePath(validId)}/inspection`, { baseURL: DOLORES_API_BASE_URL, signal });
    const result = TerminationInspectionResultSchema.parse(response.data);
    if (result.caseId !== validId) throw new Error("Kết quả kiểm tra không thuộc hồ sơ đang xem.");
    return result;
  },
  async beginRecovery(id: string, input: TerminationActionRequest) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationActionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${casePath(validId)}/recovery`, request, { baseURL: DOLORES_API_BASE_URL });
    const terminationCase = verifyCaseIdentity(response.data, validId);
    if (terminationCase.status !== "RECOVERY_PENDING") throw new Error("Dolores did not confirm recovery is pending.");
    return terminationCase;
  },
  async createInspectionTicket(id: string, input: TerminationActionRequest) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationActionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${casePath(validId)}/inspection-tickets`, request, { baseURL: DOLORES_API_BASE_URL });
    const terminationCase = verifyCaseIdentity(response.data, validId);
    if (!terminationCase.inspectionTicketId) throw new Error("Dolores did not return the termination inspection ticket ID.");
    return terminationCase;
  },
  async completeInspection(id: string, input: TerminationInspectionRequest, files: File[], idempotencyKey: string) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationInspectionRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 1, max: 1 });
    const response = await axiosClient.post<unknown>(
      `${casePath(validId)}/inspection`,
      buildEvidenceForm(request, files),
      { baseURL: DOLORES_API_BASE_URL, headers: { ...EVIDENCE_MULTIPART_HEADERS, "Idempotency-Key": idempotencyKey } },
    );
    const terminationCase = verifyCaseIdentity(response.data, validId);
    if (terminationCase.inspectionTicketId !== request.maintenanceTicketId
      || !["SETTLEMENT_PENDING", "APPROVED", "COMPLETED"].includes(terminationCase.status)) {
      throw new Error("Dolores chưa xác nhận kết quả cho phiếu kiểm tra này.");
    }
    return terminationCase;
  },
  async previewSettlement(id: string, contractId: string, input: TerminationSettlementPreviewRequest) {
    const validId = TerminationCaseIdSchema.parse(id);
    const validContractId = ContractIdSchema.parse(contractId);
    const request = TerminationSettlementPreviewRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `${casePath(validId)}/settlement-preview`, request, { baseURL: DOLORES_API_BASE_URL },
    );
    const preview = TerminationSettlementPreviewSchema.parse(response.data);
    if (preview.terminationCaseId !== validId || preview.contractId !== validContractId) {
      throw new Error("Bảng kê quyết toán không thuộc hồ sơ đang xem.");
    }
    return preview;
  },
  async settle(id: string, input: TerminationSettlementRequest, files: File[]) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationSettlementRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 1, max: 1 });
    const response = await axiosClient.post<unknown>(
      `${casePath(validId)}/settlement`,
      buildEvidenceForm(request, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    const terminationCase = verifyCaseIdentity(response.data, validId);
    if (terminationCase.status !== "APPROVED" || !terminationCase.settlementId) throw new Error("Dolores did not confirm an approved termination settlement.");
    return terminationCase;
  },
  async reject(id: string, input: TerminationRejectionRequest) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationRejectionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${casePath(validId)}/reject`, request, { baseURL: DOLORES_API_BASE_URL });
    const terminationCase = verifyCaseIdentity(response.data, validId);
    if (terminationCase.status !== "REJECTED") throw new Error("Dolores did not confirm the termination case rejection.");
    return terminationCase;
  },
  async complete(id: string, input: TerminationActionRequest) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationActionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${casePath(validId)}/complete`, request, { baseURL: DOLORES_API_BASE_URL });
    const terminationCase = verifyCaseIdentity(response.data, validId);
    if (terminationCase.status !== "COMPLETED") throw new Error("Dolores did not confirm Contract termination completion.");
    return terminationCase;
  }
};
