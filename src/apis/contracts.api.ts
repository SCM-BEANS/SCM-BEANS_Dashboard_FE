import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  ContractDocumentsSchema, ContractExpirySchema, ContractIdSchema,
  ContractListSchema, ContractSchema,
} from "@/schema/contracts.schema";

const contractPath = (id: string) => `/contracts/${encodeURIComponent(ContractIdSchema.parse(id))}`;

export const contractsApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/contracts", { baseURL: DOLORES_API_BASE_URL, signal });
    return ContractListSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(contractPath(id), { baseURL: DOLORES_API_BASE_URL, signal });
    return ContractSchema.parse(response.data);
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
