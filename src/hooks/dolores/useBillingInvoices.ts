'use client';

import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/apis/dolores/billing.api';
import { retryDoloresRead } from './queryPolicy';

export const billingInvoiceQueryKeys = {
  all: ['dolores', 'billing', 'invoices'] as const,
};

export function useBillingInvoices(enabled = true) {
  return useQuery({
    queryKey: billingInvoiceQueryKeys.all,
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
    enabled,
    retry: retryDoloresRead,
  });
}
