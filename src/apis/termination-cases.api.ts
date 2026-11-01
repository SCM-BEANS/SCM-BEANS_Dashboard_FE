import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  TerminationActionRequestSchema,
  TerminationCaseIdSchema,
  TerminationCaseRequestSchema,
  TerminationCaseResponseSchema,
  TerminationInspectionRequestSchema,
  TerminationRejectionRequestSchema,
  type TerminationCaseRequest,
  type TerminationInspectionRequest,
} from "@/schema/termination-cases.schema";

const casePath = (id: string) => `/termination-cases/${encodeURIComponent(TerminationCaseIdSchema.parse(id))}`;

export const terminationCasesApi = {
  async create(contractId: string, input: TerminationCaseRequest) {
    const validContractId = TerminationCaseIdSchema.parse(contractId);
    const request = TerminationCaseRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/contracts/${encodeURIComponent(validContractId)}/termination-cases`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return TerminationCaseResponseSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = TerminationCaseIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(casePath(validId), { baseURL: DOLORES_API_BASE_URL, signal });
    const result = TerminationCaseResponseSchema.parse(response.data);
    if (result.id !== validId) throw new Error("Dolores returned a different termination case.");
    return result;
  },
  async beginRecovery(id: string, correlationId: string) {
    const request = TerminationActionRequestSchema.parse({ correlationId });
    const response = await axiosClient.post<unknown>(`${casePath(id)}/recovery`, request, { baseURL: DOLORES_API_BASE_URL });
    return TerminationCaseResponseSchema.parse(response.data);
  },
  async createInspectionTicket(id: string, correlationId: string) {
    const request = TerminationActionRequestSchema.parse({ correlationId });
    const response = await axiosClient.post<unknown>(`${casePath(id)}/inspection-tickets`, request, { baseURL: DOLORES_API_BASE_URL });
    return TerminationCaseResponseSchema.parse(response.data);
  },
  async completeInspection(id: string, input: TerminationInspectionRequest) {
    const request = TerminationInspectionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${casePath(id)}/inspection`, request, { baseURL: DOLORES_API_BASE_URL });
    return TerminationCaseResponseSchema.parse(response.data);
  },
  async reject(id: string, reason: string, correlationId: string) {
    const request = TerminationRejectionRequestSchema.parse({ reason, correlationId });
    const response = await axiosClient.post<unknown>(`${casePath(id)}/reject`, request, { baseURL: DOLORES_API_BASE_URL });
    return TerminationCaseResponseSchema.parse(response.data);
  },
  async complete(id: string, correlationId: string) {
    const request = TerminationActionRequestSchema.parse({ correlationId });
    const response = await axiosClient.post<unknown>(`${casePath(id)}/complete`, request, { baseURL: DOLORES_API_BASE_URL });
    return TerminationCaseResponseSchema.parse(response.data);
  },
};
