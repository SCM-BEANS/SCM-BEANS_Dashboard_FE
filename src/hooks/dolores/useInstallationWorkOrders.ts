'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { installationWorkOrdersApi } from '@/apis/dolores/installationWorkOrders.api';
import {
  InstallationWorkOrderIdSchema,
  InstallationWorkOrderTenantIdSchema,
} from '@/schemas/dolores/installationWorkOrders';
import type { InstallationWorkOrderSummary } from '@/types/dolores/installationWorkOrders';
import type { Tenant } from '@/types/dolores/tenants';
import { retryDoloresRead } from './queryPolicy';
import { withTenantRequestSlot } from './tenantRequestLimiter';

export const installationWorkOrderQueryKeys = {
  all: ['dolores', 'installation-work-orders'] as const,
  byTenant: (tenantId: string) => [...installationWorkOrderQueryKeys.all, 'tenant', tenantId] as const,
  byId: (workOrderId: string) => [...installationWorkOrderQueryKeys.all, 'id', workOrderId] as const,
};

export type PlatformInstallationWorkOrder = { tenant: Tenant; workOrder: InstallationWorkOrderSummary };

export function usePlatformInstallationWorkOrders(tenants: Tenant[] | undefined, enabled = true) {
  const tenantList = tenants ?? [];
  const results = useQueries({
    queries: tenantList.map((tenant) => ({
      queryKey: installationWorkOrderQueryKeys.byTenant(tenant.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        withTenantRequestSlot(signal, () => installationWorkOrdersApi.listByTenant(tenant.id, signal)),
      enabled: enabled && InstallationWorkOrderTenantIdSchema.safeParse(tenant.id).success,
      retry: retryDoloresRead,
    })),
  });

  const workOrders: PlatformInstallationWorkOrder[] = [];
  const failedTenants: { tenant: Tenant; error: unknown; retry: () => void }[] = [];
  let completedTenantCount = 0;
  results.forEach((result, index) => {
    const tenant = tenantList[index];
    if (result.data !== undefined) {
      if (!result.isError) completedTenantCount += 1;
      result.data.forEach((workOrder) => workOrders.push({ tenant, workOrder }));
    }
    if (result.isError) failedTenants.push({ tenant, error: result.error, retry: () => { void result.refetch(); } });
  });

  return {
    workOrders,
    completedTenantCount,
    failedTenants,
    isLoading: enabled && results.some((result) => result.isPending),
    retryFailed: () => failedTenants.forEach(({ retry }) => retry()),
    refetchAll: () => results.forEach((result) => { void result.refetch(); }),
  };
}

export function useInstallationWorkOrderById(workOrderId: string | undefined, enabled = true) {
  const validWorkOrderId = Boolean(workOrderId && InstallationWorkOrderIdSchema.safeParse(workOrderId).success);
  return useQuery({
    queryKey: installationWorkOrderQueryKeys.byId(workOrderId ?? ''),
    queryFn: ({ signal }) => installationWorkOrdersApi.getById(workOrderId!, signal),
    enabled: enabled && validWorkOrderId,
    retry: retryDoloresRead,
  });
}
