'use client';

import { useQuery } from '@tanstack/react-query';
import { tenantsApi } from '@/apis/dolores/tenants.api';
import { retryDoloresRead } from './queryPolicy';

export const tenantQueryKeys = {
  list: ['dolores', 'tenants'] as const,
  detail: (id: string) => ['dolores', 'tenants', id] as const,
};

export function useTenants(enabled = true) {
  return useQuery({
    queryKey: tenantQueryKeys.list,
    queryFn: ({ signal }) => tenantsApi.list(signal),
    enabled,
    retry: retryDoloresRead,
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: tenantQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => tenantsApi.get(id!, signal),
    enabled: Boolean(id),
    retry: retryDoloresRead,
  });
}
