import { doloresAxiosClient, parseDoloresResponse } from './client';
import {
  InvoiceIdSchema,
  InvoicesSchema,
  PaymentProofIdSchema,
  PaymentProofsSchema,
} from '@/schemas/dolores/billing';
import type { Invoice, PaymentProof } from '@/types/dolores/billing';

function requireId(id: string, schema: typeof InvoiceIdSchema | typeof PaymentProofIdSchema) {
  return schema.parse(id);
}

export const billingApi = {
  listInvoices: async (signal?: AbortSignal): Promise<Invoice[]> => {
    const response = await doloresAxiosClient.get<unknown>('/billing/invoices', { signal });
    return parseDoloresResponse(response.data, InvoicesSchema);
  },

  getInvoice: async (id: string, signal?: AbortSignal): Promise<Invoice> => {
    const invoiceId = requireId(id, InvoiceIdSchema);
    const response = await doloresAxiosClient.get<unknown>(
      `/billing/invoices/${encodeURIComponent(invoiceId)}`,
      { signal }
    );
    return parseDoloresResponse(response.data, InvoicesSchema.element);
  },

  listPaymentProofs: async (invoiceId: string, signal?: AbortSignal): Promise<PaymentProof[]> => {
    const validInvoiceId = requireId(invoiceId, InvoiceIdSchema);
    const response = await doloresAxiosClient.get<unknown>(
      `/billing/invoices/${encodeURIComponent(validInvoiceId)}/payment-proofs`,
      { signal }
    );
    return parseDoloresResponse(response.data, PaymentProofsSchema);
  },

  downloadPaymentProofContent: async (proofId: string): Promise<Blob> => {
    const validProofId = requireId(proofId, PaymentProofIdSchema);
    const response = await doloresAxiosClient.get<Blob>(
      `/billing/payment-proofs/${encodeURIComponent(validProofId)}/content`,
      { headers: { Accept: '*/*' }, responseType: 'blob' }
    );
    return response.data;
  },
};
