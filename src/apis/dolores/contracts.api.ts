import {
  ContractIdSchema,
  ContractListSchema,
  ContractDocumentListSchema,
  ContractExpiryStatusSchema,
  ContractSchema,
} from '@/schemas/dolores/contracts';
import { MachineIdSchema } from '@/schemas/dolores/machines';
import { TenantSchema } from '@/schemas/dolores/tenants';
import { DoloresApiError, doloresAxiosClient, parseDoloresResponse } from './client';
import type { Contract, ContractDocument, ContractExpiryStatus } from '@/types/dolores/contracts';

function requireContractId(id: string): string {
  return ContractIdSchema.parse(id);
}

function requireTenantId(id: string): string {
  return TenantSchema.shape.id.parse(id);
}

export const contractsApi = {
  listByTenant: async (tenantId: string, signal?: AbortSignal): Promise<Contract[]> => {
    const requestedTenantId = requireTenantId(tenantId);
    const response = await doloresAxiosClient.get<unknown>(
      `/contracts/tenant/${encodeURIComponent(requestedTenantId)}`,
      { signal }
    );
    const contracts = parseDoloresResponse(response.data, ContractListSchema);
    if (contracts.some((contract) => contract.tenantId !== requestedTenantId)) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned a contract outside the requested tenant.');
    }
    return contracts;
  },

  getById: async (contractId: string, signal?: AbortSignal): Promise<Contract> => {
    const requestedContractId = requireContractId(contractId);
    const response = await doloresAxiosClient.get<unknown>(
      `/contracts/${encodeURIComponent(requestedContractId)}`,
      { signal }
    );
    const contract = parseDoloresResponse(response.data, ContractSchema);
    if (contract.id !== requestedContractId) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned a different contract than requested.');
    }
    return contract;
  },

  listByMachine: async (machineId: string, signal?: AbortSignal): Promise<Contract[]> => {
    const requestedMachineId = MachineIdSchema.parse(machineId);
    const response = await doloresAxiosClient.get<unknown>(
      `/contracts/machine/${encodeURIComponent(requestedMachineId)}/history`,
      { signal }
    );
    const contracts = parseDoloresResponse(response.data, ContractListSchema);
    if (contracts.some((contract) => contract.machineId !== requestedMachineId)) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned contract history for a different machine.');
    }
    return contracts;
  },

  getExpiryStatus: async (contractId: string, signal?: AbortSignal): Promise<ContractExpiryStatus> => {
    const requestedContractId = requireContractId(contractId);
    const response = await doloresAxiosClient.get<unknown>(
      `/contracts/${encodeURIComponent(requestedContractId)}/expiry-status`,
      { signal }
    );
    const status = parseDoloresResponse(response.data, ContractExpiryStatusSchema);
    if (status.contractId !== requestedContractId) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned expiry status for a different contract.');
    }
    return status;
  },

  listDocuments: async (contractId: string, signal?: AbortSignal): Promise<ContractDocument[]> => {
    const requestedContractId = requireContractId(contractId);
    const response = await doloresAxiosClient.get<unknown>(
      `/contracts/${encodeURIComponent(requestedContractId)}/documents`,
      { signal }
    );
    const documents = parseDoloresResponse(response.data, ContractDocumentListSchema);
    if (documents.some((document) => document.contractId !== requestedContractId)) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned a document outside the requested contract.');
    }
    return documents;
  },

  downloadDocument: async (contractId: string, documentId: string): Promise<Blob> => {
    const response = await doloresAxiosClient.get<Blob>(
      `/contracts/${encodeURIComponent(requireContractId(contractId))}/documents/${encodeURIComponent(requireContractId(documentId))}`,
      { headers: { Accept: '*/*' }, responseType: 'blob' }
    );
    return response.data;
  },
};
