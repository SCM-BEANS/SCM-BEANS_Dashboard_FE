'use client';

import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { contractsApi } from '@/apis/dolores/contracts.api';
import { ContractIdSchema } from '@/schemas/dolores/contracts';
import { MachineIdSchema } from '@/schemas/dolores/machines';
import type { Contract } from '@/types/dolores/contracts';
import type { Tenant } from '@/types/dolores/tenants';
import { retryDoloresRead } from './queryPolicy';
import { withTenantRequestSlot } from './tenantRequestLimiter';

export const contractQueryKeys = {
  all: ['dolores', 'contracts'] as const,
  byTenant: (tenantId: string) => [...contractQueryKeys.all, 'tenant', tenantId] as const,
  byId: (contractId: string) => [...contractQueryKeys.all, 'id', contractId] as const,
  detail: (tenantId: string, contractId: string) => [...contractQueryKeys.all, 'detail', tenantId, contractId] as const,
  history: (tenantId: string, machineId: string) => [...contractQueryKeys.all, 'history', tenantId, machineId] as const,
  expiryStatus: (tenantId: string, contractId: string) => [...contractQueryKeys.all, 'expiry', tenantId, contractId] as const,
  documents: (tenantId: string, contractId: string) => [...contractQueryKeys.all, 'documents', tenantId, contractId] as const,
};

export type PlatformContract = { tenant: Tenant; contract: Contract };

export function usePlatformContracts(tenants: Tenant[] | undefined, enabled = true) {
  const tenantList = tenants ?? [];
  const results = useQueries({
    queries: tenantList.map((tenant) => ({
      queryKey: contractQueryKeys.byTenant(tenant.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        withTenantRequestSlot(signal, () => contractsApi.listByTenant(tenant.id, signal)),
      enabled: enabled && ContractIdSchema.safeParse(tenant.id).success,
      retry: retryDoloresRead,
    })),
  });

  const contracts: PlatformContract[] = [];
  const failedTenants: { tenant: Tenant; error: unknown; retry: () => void }[] = [];
  let completedTenantCount = 0;
  results.forEach((result, index) => {
    const tenant = tenantList[index];
    if (result.data !== undefined) {
      if (!result.isError) completedTenantCount += 1;
      result.data.forEach((contract) => contracts.push({ tenant, contract }));
    }
    if (result.isError) failedTenants.push({ tenant, error: result.error, retry: () => { void result.refetch(); } });
  });

  return {
    contracts,
    completedTenantCount,
    failedTenants,
    isLoading: enabled && results.some((result) => result.isPending),
    retryFailed: () => failedTenants.forEach(({ retry }) => retry()),
    refetchAll: () => results.forEach((result) => { void result.refetch(); }),
  };
}

export function useContractDetail(tenantId: string | undefined, contractId: string | undefined, enabled = true) {
  const validTenantId = Boolean(tenantId && ContractIdSchema.safeParse(tenantId).success);
  const validContractId = Boolean(contractId && ContractIdSchema.safeParse(contractId).success);
  return useQuery({
    queryKey: contractQueryKeys.detail(tenantId ?? '', contractId ?? ''),
    queryFn: ({ signal }) => contractsApi.getById(contractId!, signal),
    enabled: enabled && validTenantId && validContractId,
    retry: retryDoloresRead,
  });
}

export function useContractById(contractId: string | undefined, enabled = true) {
  const validContractId = Boolean(contractId && ContractIdSchema.safeParse(contractId).success);
  return useQuery({
    queryKey: contractQueryKeys.byId(contractId ?? ''),
    queryFn: ({ signal }) => contractsApi.getById(contractId!, signal),
    enabled: enabled && validContractId,
    retry: retryDoloresRead,
  });
}

export function useContractMachineHistory(tenantId: string | undefined, machineId: string | null | undefined, enabled: boolean) {
  const validTenantId = Boolean(tenantId && ContractIdSchema.safeParse(tenantId).success);
  const validMachineId = Boolean(machineId && MachineIdSchema.safeParse(machineId).success);
  return useQuery({
    queryKey: contractQueryKeys.history(tenantId ?? '', machineId ?? ''),
    queryFn: ({ signal }) => contractsApi.listByMachine(machineId!, signal),
    enabled: enabled && validTenantId && validMachineId,
    retry: retryDoloresRead,
  });
}

export function useContractExpiryStatus(tenantId: string | undefined, contractId: string | undefined, enabled: boolean) {
  const validTenantId = Boolean(tenantId && ContractIdSchema.safeParse(tenantId).success);
  const validContractId = Boolean(contractId && ContractIdSchema.safeParse(contractId).success);
  return useQuery({
    queryKey: contractQueryKeys.expiryStatus(tenantId ?? '', contractId ?? ''),
    queryFn: ({ signal }) => contractsApi.getExpiryStatus(contractId!, signal),
    enabled: enabled && validTenantId && validContractId,
    retry: retryDoloresRead,
  });
}

export function useContractDocuments(tenantId: string | undefined, contractId: string | undefined, enabled: boolean) {
  const validTenantId = Boolean(tenantId && ContractIdSchema.safeParse(tenantId).success);
  const validContractId = Boolean(contractId && ContractIdSchema.safeParse(contractId).success);
  return useQuery({
    queryKey: contractQueryKeys.documents(tenantId ?? '', contractId ?? ''),
    queryFn: ({ signal }) => contractsApi.listDocuments(contractId!, signal),
    enabled: enabled && validTenantId && validContractId,
    retry: retryDoloresRead,
  });
}

function safeDownloadName(filename: string): string {
  const sanitized = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  return sanitized || 'contract-document';
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = safeDownloadName(filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function useDownloadContractDocument() {
  return useMutation({
    mutationFn: async ({ contractId, documentId, filename }: { contractId: string; documentId: string; filename: string }) => {
      const validContractId = ContractIdSchema.parse(contractId);
      const validDocumentId = ContractIdSchema.parse(documentId);
      const blob = await contractsApi.downloadDocument(validContractId, validDocumentId);
      saveBlob(blob, filename);
    },
    retry: false,
    gcTime: 0,
  });
}
