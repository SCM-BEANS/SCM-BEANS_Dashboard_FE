import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  ContractDocumentsSchema, ContractDocumentSchema, ContractExpirySchema, ContractIdSchema,
  ContractExpiryDecisionRequestSchema,
  CreateContractRequestSchema, CreateContractResponseSchema, type CreateContractRequest,
  ContractListSchema, ContractSchema, ModeratorContractSchema,
  ContractContinuationRequestSchema, ContractPolicyAmendmentRequestSchema,
  ContractPolicyHistorySchema, TerminationCaseRequestSchema, TerminationCaseResponseSchema,
  type ContractContinuationRequest, type ContractExpiryDecisionRequest, type ContractPolicyAmendmentRequest, type TerminationCaseRequest,
} from "@/schema/contracts.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";

const contractPath = (id: string) => `/contracts/${encodeURIComponent(ContractIdSchema.parse(id))}`;

export const contractsApi = {
  async create(input: CreateContractRequest) {
    const request = CreateContractRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/contracts", request, { baseURL: DOLORES_API_BASE_URL });
    return CreateContractResponseSchema.parse(response.data);
  },
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/contracts", { baseURL: DOLORES_API_BASE_URL, signal });
    return ContractListSchema.parse(response.data);
  },
  async listByOwner(ownerId: string, signal?: AbortSignal) {
    const validOwnerId = ProfileIdSchema.parse(ownerId);
    const response = await axiosClient.get<unknown>(`/contracts/owner/${encodeURIComponent(validOwnerId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return ContractListSchema.parse(response.data);
  },
  async listByTenant(tenantId: string, signal?: AbortSignal) {
    return contractsApi.listByOwner(tenantId, signal);
  },
  async getById(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(contractPath(id), { baseURL: DOLORES_API_BASE_URL, signal });
    return ContractSchema.parse(response.data);
  },
  async getModeratorById(id: string, signal?: AbortSignal) {
    const validId = ContractIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(contractPath(validId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const contract = ModeratorContractSchema.parse(response.data);
    if (contract.id !== validId) {
      throw new Error("Dolores returned a contract that does not match the requested ID");
    }
    return contract;
  },
  async getExpiry(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${contractPath(id)}/expiry-status`, {
      baseURL: DOLORES_API_BASE_URL, signal,
    });
    return ContractExpirySchema.parse(response.data);
  },
  async recordExpiryDecision(id: string, input: ContractExpiryDecisionRequest) {
    const contractId = ContractIdSchema.parse(id);
    const request = ContractExpiryDecisionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${contractPath(contractId)}/expiry-decision`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const expiry = ContractExpirySchema.parse(response.data);
    if (expiry.contractId && expiry.contractId !== contractId) {
      throw new Error("Dolores returned expiry status for a different contract.");
    }
    return expiry;
  },
  async getDocuments(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${contractPath(id)}/documents`, {
      baseURL: DOLORES_API_BASE_URL, signal,
    });
    return ContractDocumentsSchema.parse(response.data);
  },
  async uploadDocument(id: string, input: { documentType: "MAIN_CONTRACT"; file: File }) {
    const contractId = ContractIdSchema.parse(id);
    const { file } = input;
    if (!file || file.size <= 0) throw new Error("A non-empty contract document is required.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Contract documents cannot exceed 20 MB.");
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      throw new Error("Contract documents must be a PDF, JPEG, or PNG file.");
    }
    const form = new FormData();
    form.append("file", file);
    const response = await axiosClient.post<unknown>(`${contractPath(contractId)}/documents`, form, {
      baseURL: DOLORES_API_BASE_URL,
      params: { documentType: input.documentType },
      headers: { "Content-Type": "multipart/form-data" },
    });
    const document = ContractDocumentSchema.parse(response.data);
    if (document.contractId !== contractId) throw new Error("Dolores returned a document for a different contract.");
    return document;
  },
  async archiveDocument(contractId: string, documentId: string) {
    const validContractId = ContractIdSchema.parse(contractId);
    const validDocumentId = ContractIdSchema.parse(documentId);
    const response = await axiosClient.post<unknown>(
      `${contractPath(validContractId)}/documents/${encodeURIComponent(validDocumentId)}/archive`,
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const document = ContractDocumentSchema.parse(response.data);
    if (document.contractId !== validContractId || document.id !== validDocumentId) {
      throw new Error("Dolores returned a different contract document.");
    }
    return document;
  },
  async activate(id: string) {
    const contractId = ContractIdSchema.parse(id);
    await axiosClient.post<unknown>(`${contractPath(contractId)}/activate`, undefined, {
      baseURL: DOLORES_API_BASE_URL,
    });
  },
  async amendPolicy(id: string, input: ContractPolicyAmendmentRequest) {
    const contractId = ContractIdSchema.parse(id);
    const request = ContractPolicyAmendmentRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${contractPath(contractId)}/policy-amendments`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return ContractSchema.parse(response.data);
  },
  async getPolicyHistory(id: string, signal?: AbortSignal) {
    const contractId = ContractIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${contractPath(contractId)}/policy-history`, {
      baseURL: DOLORES_API_BASE_URL,
      params: { page: 0, size: 100 },
      signal,
    });
    return ContractPolicyHistorySchema.parse(response.data);
  },
  async continueContract(id: string, input: ContractContinuationRequest) {
    const contractId = ContractIdSchema.parse(id);
    const request = ContractContinuationRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${contractPath(contractId)}/continuations`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return CreateContractResponseSchema.parse(response.data);
  },
  async requestTermination(id: string, input: TerminationCaseRequest) {
    const contractId = ContractIdSchema.parse(id);
    const request = TerminationCaseRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`/contracts/${encodeURIComponent(contractId)}/termination-cases`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return TerminationCaseResponseSchema.parse(response.data);
  },
  async getMachineHistory(machineId: string, signal?: AbortSignal) {
    const validId = ContractIdSchema.parse(machineId);
    const response = await axiosClient.get<unknown>(`/contracts/machine/${encodeURIComponent(validId)}/history`, {
      baseURL: DOLORES_API_BASE_URL, signal,
    });
    return ContractListSchema.parse(response.data);
  },
  async downloadDocument(contractId: string, documentId: string, signal?: AbortSignal) {
    const contract = ContractIdSchema.parse(contractId);
    const document = ContractIdSchema.parse(documentId);
    const response = await axiosClient.get<Blob>(`${contractPath(contract)}/documents/${encodeURIComponent(document)}`, {
      baseURL: DOLORES_API_BASE_URL, responseType: "blob", signal,
    });
    return response.data;
  },
};
