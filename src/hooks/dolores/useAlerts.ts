'use client';

import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/apis/dolores/alerts.api';
import { retryDoloresRead } from './queryPolicy';

export const alertQueryKeys = {
  all: ['dolores', 'alerts'] as const,
  list: () => [...alertQueryKeys.all, 'list'] as const,
};

export function useAlerts() {
  return useQuery({
    queryKey: alertQueryKeys.list(),
    queryFn: ({ signal }) => alertsApi.list(signal),
    retry: retryDoloresRead,
  });
}
