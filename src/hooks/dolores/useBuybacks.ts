'use client';

import { useQuery } from '@tanstack/react-query';
import { buybacksApi } from '@/apis/dolores/buybacks.api';
import { BuybackCaseIdSchema } from '@/schemas/dolores/buybacks';
import { retryDoloresRead } from './queryPolicy';

export const buybackQueryKeys = {
  detail: (id: string | null) => ['dolores', 'buybacks', 'detail', id] as const,
};

export function useBuybackCase(id: string | null, enabled = true) {
  const validId = id && BuybackCaseIdSchema.safeParse(id).success ? id : null;
  return useQuery({
    queryKey: buybackQueryKeys.detail(validId),
    queryFn: ({ signal }) => {
      if (!validId) throw new Error('A canonical buyback UUID is required.');
      return buybacksApi.getById(validId, signal);
    },
    enabled: enabled && Boolean(validId),
    retry: retryDoloresRead,
  });
}
