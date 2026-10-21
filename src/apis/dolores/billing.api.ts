import { requestDolores } from './client';
import { InvoicesSchema } from '@/schemas/dolores/billing';

export const billingApi = {
  listInvoices(signal?: AbortSignal) {
    return requestDolores(
      { method: 'GET', url: '/billing/invoices', signal },
      InvoicesSchema
    );
  },
};
