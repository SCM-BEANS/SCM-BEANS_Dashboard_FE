import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  ContractDocumentsSchema, ContractExpirySchema, ContractIdSchema,
  CreateContractRequestSchema, CreateContractResponseSchema, type CreateContractRequest,
  ContractListSchema, ContractSchema, ModeratorContractListSchema, ModeratorContractSchema,
} from "@/schema/contracts.schema";
import { TenantIdSchema } from "@/schema/tenants.schema";

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
  async listByTenant(tenantId: string, signal?: AbortSignal) {
    const validTenantId = TenantIdSchema.parse(tenantId);
    const response = await axiosClient.get<unknown>(
      `/contracts/tenant/${encodeURIComponent(validTenantId)}`,
      { baseURL: DOLORES_API_BASE_URL, signal },
    );
    const contracts = ModeratorContractListSchema.parse(response.data);
    if (contracts.some((contract) => contract.tenantId !== validTenantId)) {
      throw new Error("Dolores returned a contract outside the requested tenant scope");
    }
    return contracts;
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
  async getDocuments(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${contractPath(id)}/documents`, {
      baseURL: DOLORES_API_BASE_URL, signal,
    });
    return ContractDocumentsSchema.parse(response.data);
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
