'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { billingApi } from '@/apis/dolores/billing.api';
import { InvoiceIdSchema, PaymentProofIdSchema } from '@/schemas/dolores/billing';
import { retryDoloresRead } from './queryPolicy';

export const billingInvoiceQueryKeys = {
  all: ['dolores', 'billing', 'invoices'] as const,
  detail: (id: string | null) => ['dolores', 'billing', 'invoices', 'detail', id] as const,
  paymentProofs: (invoiceId: string | null) => ['dolores', 'billing', 'invoices', invoiceId, 'payment-proofs'] as const,
};

export function useBillingInvoices(enabled = true) {
  return useQuery({
    queryKey: billingInvoiceQueryKeys.all,
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
    enabled,
    retry: retryDoloresRead,
  });
}

export function useBillingInvoice(id: string | null, enabled = true) {
  const validId = id && InvoiceIdSchema.safeParse(id).success ? id : null;
  return useQuery({
    queryKey: billingInvoiceQueryKeys.detail(validId),
    queryFn: ({ signal }) => {
      if (!validId) throw new Error('A canonical invoice UUID is required.');
      return billingApi.getInvoice(validId, signal);
    },
    enabled: enabled && Boolean(validId),
    retry: retryDoloresRead,
  });
}

export function useInvoicePaymentProofs(invoiceId: string | null, enabled = true) {
  const validId = invoiceId && InvoiceIdSchema.safeParse(invoiceId).success ? invoiceId : null;
  return useQuery({
    queryKey: billingInvoiceQueryKeys.paymentProofs(validId),
    queryFn: ({ signal }) => {
      if (!validId) throw new Error('A canonical invoice UUID is required.');
      return billingApi.listPaymentProofs(validId, signal);
    },
    enabled: enabled && Boolean(validId),
    retry: retryDoloresRead,
  });
}

function safeDownloadName(filename: string): string {
  return filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || 'payment-proof';
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

export function useDownloadPaymentProof() {
  return useMutation({
    mutationFn: async ({ proofId, filename }: { proofId: string; filename: string }) => {
      const validProofId = PaymentProofIdSchema.parse(proofId);
      const blob = await billingApi.downloadPaymentProofContent(validProofId);
      saveBlob(blob, filename);
    },
    retry: false,
    gcTime: 0,
  });
}
