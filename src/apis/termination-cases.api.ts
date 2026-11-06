import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  TerminationActionRequestSchema,
  TerminationCaseCreateRequestSchema,
  TerminationCaseIdSchema,
  TerminationCaseSchema,
  TerminationInspectionRequestSchema,
  TerminationRejectionRequestSchema,
  TerminationSettlementRequestSchema,
  type TerminationActionRequest,
  type TerminationCaseCreateRequest,
  type TerminationInspectionRequest,
  type TerminationRejectionRequest,
  type TerminationSettlementRequest,
} from "@/schema/termination-workflow.schema";
import { ContractIdSchema } from "@/schema/contracts.schema";

const casePath = (id: string) => `/termination-cases/${encodeURIComponent(TerminationCaseIdSchema.parse(id))}`;

function verifyCaseIdentity(value: unknown, expectedId: string, expectedContractId?: string) {
  const terminationCase = TerminationCaseSchema.parse(value);
  if (terminationCase.id !== expectedId || (expectedContractId && terminationCase.contractId !== expectedContractId)) {
    throw new Error("Dolores returned a different termination case than requested.");
  }
  return terminationCase;
}

export const terminationCasesApi =  {
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
  async completeInspection(id: string, input: TerminationInspectionRequest) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationInspectionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${casePath(validId)}/inspection`, request, { baseURL: DOLORES_API_BASE_URL });
    const terminationCase = verifyCaseIdentity(response.data, validId);
    if (terminationCase.status !== "SETTLEMENT_PENDING") throw new Error("Dolores did not confirm the termination inspection.");
    return terminationCase;
  },
  async settle(id: string, input: TerminationSettlementRequest) {
    const validId = TerminationCaseIdSchema.parse(id);
    const request = TerminationSettlementRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${casePath(validId)}/settlement`, request, { baseURL: DOLORES_API_BASE_URL });
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
