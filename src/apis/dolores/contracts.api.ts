import {
  ContractIdSchema,
  ContractListSchema,
  ContractDocumentListSchema,
  ContractExpiryStatusSchema,
  ContractSchema,
} from '@/schemas/dolores/contracts';
import { MachineIdSchema } from '@/schemas/dolores/machines';
import { TenantSchema } from '@/schemas/dolores/tenants';
import { DoloresApiError, requestDolores, requestDoloresBlob } from './client';

function requireContractId(id: string): string {
  return ContractIdSchema.parse(id);
}

function requireTenantId(id: string): string {
  return TenantSchema.shape.id.parse(id);
}

export const contractsApi = {
  listByTenant: async (tenantId: string, signal?: AbortSignal) => {
    const requestedTenantId = requireTenantId(tenantId);
    const contracts = await requestDolores(
      { method: 'GET', url: `/contracts/tenant/${encodeURIComponent(requestedTenantId)}`, signal },
      ContractListSchema
    );
    if (contracts.some((contract) => contract.tenantId !== requestedTenantId)) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned a contract outside the requested tenant.');
    }
    return contracts;
  },

  getById: async (contractId: string, signal?: AbortSignal) => {
    const requestedContractId = requireContractId(contractId);
    const contract = await requestDolores(
      { method: 'GET', url: `/contracts/${encodeURIComponent(requestedContractId)}`, signal },
      ContractSchema
    );
    if (contract.id !== requestedContractId) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned a different contract than requested.');
    }
    return contract;
  },

  listByMachine: async (machineId: string, signal?: AbortSignal) => {
    const requestedMachineId = MachineIdSchema.parse(machineId);
    const contracts = await requestDolores(
      { method: 'GET', url: `/contracts/machine/${encodeURIComponent(requestedMachineId)}/history`, signal },
      ContractListSchema
    );
    if (contracts.some((contract) => contract.machineId !== requestedMachineId)) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned contract history for a different machine.');
    }
    return contracts;
  },

  getExpiryStatus: async (contractId: string, signal?: AbortSignal) => {
    const requestedContractId = requireContractId(contractId);
    const status = await requestDolores(
      { method: 'GET', url: `/contracts/${encodeURIComponent(requestedContractId)}/expiry-status`, signal },
      ContractExpiryStatusSchema
    );
    if (status.contractId !== requestedContractId) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned expiry status for a different contract.');
    }
    return status;
  },

  listDocuments: async (contractId: string, signal?: AbortSignal) => {
    const requestedContractId = requireContractId(contractId);
    const documents = await requestDolores(
      {
        method: 'GET',
        url: `/contracts/${encodeURIComponent(requestedContractId)}/documents`,
        signal,
      },
      ContractDocumentListSchema
    );
    if (documents.some((document) => document.contractId !== requestedContractId)) {
      throw new DoloresApiError('invalid_response', null, 'Dolores returned a document outside the requested contract.');
    }
    return documents;
  },

  downloadDocument: (contractId: string, documentId: string) =>
    requestDoloresBlob({
      method: 'GET',
      url: `/contracts/${encodeURIComponent(requireContractId(contractId))}/documents/${encodeURIComponent(requireContractId(documentId))}`,
    }),
};
